const UserModel = firebase.auth();
const DB = firebase.firestore();


const app = Sammy('#root', function () {

    this.use('Handlebars', 'hbs');

    // Home route
    this.get('/home', function (context) {

        DB.collection('offers')
            .get()
            .then((response) => {
                context.offers = response.docs.map((offer) => { return { id: offer.id, ...offer.data() } });

                extendContext(context)
                    .then(function () {
                        if (context.isLoggedIn == true) {
                            this.partial('./templates/homeUser.hbs');
                        } else {
                            this.partial('./templates/homeGuest.hbs');
                        }
                    })
            })
            .catch(e => console.log(e));
    });

    // User routes
    this.get('register', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/register.hbs')
            })

    });

    this.get('/logout', function (context) {
        UserModel.signOut()
            .then(response => {
                clearUserData();
                this.redirect('/home');
            })
    });

    this.get('login', function (context) {


        extendContext(context)
            .then(function () {
                this.partial('./templates/login.hbs')
            });
    });

    this.post('/register', function (context) {
        const { email, password, repeatPassword } = context.params;

        if (password !== repeatPassword) {
            return;
        }

        UserModel.createUserWithEmailAndPassword(email, password)
            .then((userData) => {
                console.log(userData);
                this.redirect('/login');
            })
            .catch(error => console.log(error))
    });

    this.post('/login', function (context) {


        const { email, password } = context.params;

        UserModel.signInWithEmailAndPassword(email, password)
            .then((userData) => {
                saveUserData(userData);
                console.log(userData);
                this.redirect('/home');
            })
            .catch(e => console.log(e))
    })

    // Offers routes
    this.get('/create-offer', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/createOffer.hbs');
            })
    });
    this.get('/edit-offer/:offerId', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/editOffer.hbs');
            })
    });
    this.get('/details/:offerId', function (context) {
        const { offerId } = context.params;

        DB.collection('offers').doc(offerId).get()
            .then((response) => {

                const { uid } = getUserData();

                const actualOfferData = response.data();
                const imTheSalesman = actualOfferData.salesman === getUserData().uid;
                const userIndex = actualOfferData.clients.indexOf(getUserData().uid);

                const imInTheClientsList = userIndex > -1;

                context.offer = { ...actualOfferData, imTheSalesman, id: offerId, imInTheClientsList  };
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/details.hbs');
                    });
            })

    });

    this.post('/create-offer', function (context) {
        const { name, price, imageUrl, description, brand } = context.params;

        DB.collection('offers').add({
            name,
            price,
            imageUrl,
            description,
            brand,
            salesman: getUserData().uid,
            clients: []
        })
            .then((createdProduct) => {
                console.log(createdProduct);
                this.redirect('/home');
            })
            .catch(e => console.log(e));
    });

    this.get('/delete/:offerId', function (context) {
        const { offerId } = context.params;

        DB.collection('offers').doc(offerId).delete()
            .then(() => {
                this.redirect('/home');
            })
            .catch(e => console.log(e));
    });

    this.get('/edit/:offerId', function (context) {

        const { offerId } = context.params;

        DB.collection('offers')
            .doc(offerId)
            .get()
            .then((response) => {
                context.offer = { id: offerId, ...response.data() };

                extendContext(context)
                    .then(function () {
                        this.partial('./templates/editOffer.hbs');
                    });
            })
            .catch(e => console.log(e));
    });

    this.post('edit/:offerId', function (context) {
        const { offerId, name, price, brand, description, imageUrl } = context.params;

        DB.collection('offers')
            .doc(offerId)
            .get()
            .then((response) => {
                return DB.collection('offers').doc(offerId).set({
                    ...response.data(),
                    name,
                    price,
                    imageUrl,
                    description,
                    brand
                })
            })
            .then((response) => {
                this.redirect(`/details/${offerId}`);
            })
            .catch(e => console.log(e));
    });

    this.get('/buy/:offerId', function (context) {
        const { offerId } = context.params;
        const { uid }  = getUserData();

        DB.collection('offers')
            .doc(offerId)
            .get()
            .then((response) => {
                const offerData = { ...response.data() };
                offerData.clients.push(uid);

                return DB.collection('offers')
                    .doc(offerId)
                    .set(offerData)
            })
            .then(() => {
                this.redirect(`/details/${offerId}`);
            })
            .catch(e => console.log(e));
    });
});

(() => {
    app.run('/home');
})();

function extendContext(context) {

    const user = getUserData();
    context.isLoggedIn = Boolean(user);
    context.userEmail = user ? user.email : '';

    return context.loadPartials({
        'header': './partials/header.hbs',
        'footer': './partials/footer.hbs',
    });
}

function saveUserData(data) {
    const { user: { email, uid } } = data;
    localStorage.setItem('user', JSON.stringify({ email, uid }));
}

function getUserData() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function clearUserData(user) {
    this.localStorage.removeItem('user');
}
'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// Architecture Phase

class Workout {
  // Date and unique id for each workout
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coord, distance, duration) {
    // Common properties of both class
    this.coord = coord; // [lat,lan]
    this.distance = distance; // km
    this.duration = duration; // min
  }
  clickMe() {
    this.clicks++;
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.name.charAt(0).toUpperCase() + this.name.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}
// Running Class
class Running extends Workout {
  name = 'running';
  constructor(coord, distance, duration, cadence) {
    super(coord, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  // Pace calculator
  calcPace() {
    // duration(min)/distance(km)
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// Cycling Class
class Cycling extends Workout {
  name = 'cycling';
  constructor(coord, distance, duration, elevGain) {
    super(coord, distance, duration);
    this.elevGain = elevGain;
    this.calcSpeed();
    this._setDescription();
  }
  // Speed calculator
  calcSpeed() {
    // km/hr
    this.speed = this.distance / (this.duration * 60);
    return this.speed;
  }
  calcEnery() {}
}
////////// TESTING ///////////////////

const run1 = new Running([76, -23], 56, 48, 23);
const cycle1 = new Cycling([76, -23], 56, 88, 56);
// console.log(run1, cycle1);

////////////////////////////// APPLICATION ARCHITECTURE //////////////////////////////////////////////////
class App {
  // Private Properties
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  constructor() {
    // Constructor called automatically when new object is created
    // Get user's geographical co-ordinates
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Handling click on map Event
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Value change event
    inputType.addEventListener('change', this._toggleElevationField);

    // Popup Movement Event
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        console.log('Sorry,error while getting position');
      });
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    // console.log(this);
    // Current Location Link
    // console.log(`https://www.google.co.in/maps/@${latitude}.${longitude}z`);

    // Coord Array of Current Location
    const array = [latitude, longitude];

    // Leaflet Map
    this.#map = L.map('map').setView(array, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    // Loading Map
    this.#workouts.forEach(entry => {
      this._renderWorkout(entry);
      this._renderWorkoutMarker(entry);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Hide the form + Clear input fields
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

    form.classList.add('hidden');
  }
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    // Helper functions
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // If workout is running then create Running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      // Guard clause
      // if (!Number.isFinite(cadence) | !Number.isNaN(cadence))
      if (!validInput(distance, duration, cadence) || !allPositive(distance, duration, cadence)) return alert('Input have to be a positive number');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling  then create Cycling  object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (!validInput(distance, duration, elevation)) return alert('Input have to be a valid number');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add the new workout to the workout array
    this.#workouts.push(workout);
    // console.log(this.#workouts);
    // Render workout on the map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on the list
    this._renderWorkout(workout);

    // Hiding form
    this._hideForm();

    // Local Storage
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    // L.marker gives the geographic landmark/location based on provided latitude and Longitude
    L.marker(workout.coord)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.name}-popup `,
        })
      )
      .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
      .openPopup();
  }

  _renderWorkout(workout) {
    // console.log(workout);
    let html = `
    <li class="workout workout--${workout.name}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">🏃‍♂️</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          
    `;
    if (workout.name === 'running') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
      </li>`;
    }
    if (workout.name === 'cycling') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.elevGain}</span>
            <span class="workout__unit">spm</span>
          </div>
      </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);

    if (!workoutEl) return;
    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
    console.log(workout);
    this.#map.setView(workout.coord, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // Creating Public Interface
    // workout.clickMe();
  }
  _setLocalStorage() {
    localStorage.setItem('workout', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = localStorage.getItem('workout');
    // console.log(JSON.parse(data));
    if (!data) return;
    this.#workouts = JSON.parse(data);
  }

  reset() {
    localStorage.removeItem('workout');
    location.reload();
  }
}

const app = new App();

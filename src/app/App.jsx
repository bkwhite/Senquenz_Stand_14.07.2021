import React                from 'react';
import                           '../css/app.css';
import SunCalc              from 'suncalc';


//React Components
import {TopBar}             from './interface/modules/TopBar';
import {BottomBar}          from './interface/modules/BottomBar';
import {Settings}           from './interface/modules/Settings';
import {AudioAnalyser}      from './audio/AudioAnalyser';
import {DevelopInfo}        from './interface/modules/DevelopInfo';
import {BarVisualizer}      from './audio/BarVisualizer';
import {StartScreen}        from './interface/modules/StartScreen';
import {VisualsRoot}        from './visuals/VisualsRoot';

// config
import config               from '../config/config.json';

// link the configuration data
const c_interface          = config.interface;
const c_duration_fadeOut   = config.interface.durationFadeOut;
const c_audio_data         = config.audioAnalyser;
const c_settings           = config.settings;
const c_map                = c_settings.mapSettings;
const c_data_mapping       = config.geoDataMapping;
const c_visuals_data       = config.visuals;


export class App extends React.PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            start:              false,
            visibleSettings:    c_interface.visibleSettings,
            visibleInterface:   c_interface.visibleInterface,
            showInterfaceCom:   true,
            visibleVisuals:     c_interface.visibleVisuals,

            //Settings
            microphoneInput:    c_settings.microphoneInput,
            autoSensitivity:    c_settings.autoSensitivity,
            locationDetection:  c_settings.locationDetection,
            partyMode:          c_settings.partyMode,
            projectionMode:     c_settings.projectionMode,
            play:               true,
            changeVisuals:      false,

            //Location
            currentLocation: {
                lat:            Math.random() * c_map.maxLat * 2 - c_map.maxLat,
                lng:            Math.random() * c_map.maxLng * 2 - c_map.maxLng,
                zoom:           c_map.zoomStart
            },
            map:                null,

            //Audio parameter
            audio:              null,
            waveAudioData:      new Uint8Array(0),
            barAudioData:       new Uint8Array(0),
            micSensitivity:     c_audio_data.micSensitivity,

            //Visuals parameter
            visualsParameter: {
                brightness:         0.0,
                hilly:              0.5,
                water:              0.5,
                urban:              0.5,
                structureSize:      0.5,
            },


            visualsMount:       false,
            speed:              c_visuals_data.speed,
            avg:                0.5

        };
    }

    // Remove later, only Dev
    handleDevEvent(event){
        if(event.target.type === 'range'){
            if(event.target.name === 'speed'){
                this.setState({
                    speed: parseFloat(event.target.value)
                })
            }else{
                this.setState(prevState => {
                    let visualsParameter = Object.assign({}, prevState.visualsParameter);
                    visualsParameter[event.target.name] = parseFloat(event.target.value);
                    return {visualsParameter};
                })
            }

        }

        //Vorläufig
        if (event.target.name === 'update'){
            this.setState({
                visualsMount: !this.state.visualsMount
            })
        }
    }

    async start(){
        await this.getGeoData();

        this.fadeOutInterface = window.setTimeout(() => this.hideInterface(), c_duration_fadeOut);
        this.updateGeoData    = window.setTimeout(() => this.getGeoData(), c_data_mapping.updateDuration);

        this.setState({
            start:          true,
            changeVisuals:  true
        })
    }

    //Settings
    async handleInputEvent(event){
        // Switches
        if (event.target.type === 'checkbox') {
            if (event.target.name === 'microphoneInput') {
                if (this.state.audio) {
                    this.stopMicrophone();
                    this.setState({
                        play:   false
                    });
                } else {
                    this.getMicrophone();
                    this.setState({
                        play:   true
                    });
                }
            } else if (event.target.name === 'locationDetection') {
                if (event.target.checked) {
                    this.getUserLocation();
                } else {
                    this.setState({
                        locationDetection: false
                    });
                }

            } else if (event.target.name === 'projectionMode') {
                this.setState({
                    projectionMode: event.target.checked,
                    changeVisuals: true
                });

            } else if (event.target.name === 'partyMode') {
                this.setState({
                    partyMode: event.target.checked,
                    changeVisuals: true
                }, () => this.getGeoData());

            } else {
                this.setState({
                    [event.target.name]: event.target.checked
                });
            }
        }

        // Buttons
        if(event.target.type === 'submit'){
            if(event.target.className === 'buttonSetLocation'){
                await this.getGeoData();
                this.setState({
                    changeVisuals: true
                });
            }
        }

        // Slider
        if(event.target.type === 'range'){
            this.setState({
                [event.target.name]: parseFloat(event.target.value)
            });
        }

        // Icons
        if(event.target.id === 'play'){
            this.setState((state) => ({
                play:   !state.play
            }));
            if(this.state.audio){
                this.stopMicrophone();
            }
        }

        if(event.target.id === 'pause'){
            this.setState((state) => ({
                play:   !state.play
            }));
            if(!this.state.audio){
                this.getMicrophone();
            }
        }
    }

    // open & close the settings sidebar
    toggleSettings(){
        this.setState(prevState =>{
            let visibleSettings = !prevState.visibleSettings;
            return {visibleSettings}
        });
    }

    // Hide the interface when mouse does not move for a certain amount of time
    handleMouseEvent(){
        this.showInterface();
        window.clearTimeout(this.fadeOutInterface);
        this.fadeOutInterface = window.setTimeout(() => this.hideInterface(), c_duration_fadeOut);
    }

    // Show and hide the interface components
    hideInterface(){
        if(!this.state.visibleSettings){
            this.setState({
                visibleInterface: false,
                showInterfaceCom: false
            });
        }
    }
    showInterface(){
        this.setState({ visibleInterface: true });
        window.setTimeout(() => this.setState({
            showInterfaceCom: true
        }), 500);
    }


    // Get audio input and handle microphone button
    async getMicrophone(){
        document.getElementsByTagName("body")[0].style.cursor = 'wait';

        const audio = await navigator.mediaDevices.getUserMedia({
            audio: true
        });
        this.setState({
            audio:              audio,
            microphoneInput:    true
        });

        document.getElementsByTagName("body")[0].style.cursor = 'default';
    }
    stopMicrophone(){
        this.state.audio.getTracks().forEach(track => track.stop());
        this.setState({
            audio:              null,
            microphoneInput:    false
        });
    }

    // Global audio
    setAudioData(audioData, wave, speed, avg){
       let newSpeed = this.projectValToInterval(speed, c_audio_data.min, c_audio_data.max, c_data_mapping.visualsValMin, c_data_mapping.visualsValMax);
       let newAVG   = this.projectValToInterval(avg, c_audio_data.min, c_audio_data.max, c_data_mapping.visualsValMin, c_data_mapping.visualsValMax);
        if(wave){
            this.setState({
                waveAudioData:  audioData
            });
        }else{
            this.setState({
                barAudioData:   audioData,
                speed:          newSpeed.toFixed(2),
                avg:            newAVG
            });
        }
    }

    // Adjust the mic sensitivity
    adjustMicSensitivity(value){
        let newValue = this.state.micSensitivity + value;

        if (newValue >= c_settings.sliderSen.min && newValue <= c_settings.sliderSen.max){
            console.log('Adjust!: '+ newValue);
            this.setState({
                micSensitivity: newValue
            });
        }
    }

    // Global location data
    setLocation(lat, lng, zoom){
        this.setState({
            currentLocation: {lat, lng, zoom}
        });
    }

    // Global Map
    getMap(map){
        this.setState({
            map: map
        })
    }

    // Stop reload of Visuals
    stopReload(){
        this.setState({
            changeVisuals: false
        })
    }


    // Get current user location
    getUserLocation(){
        navigator.geolocation.getCurrentPosition(position => {
            this.setState({
                locationDetection: true,
                currentLocation: {
                    lat:    position.coords.latitude,
                    lng:    position.coords.longitude,
                    zoom:   c_map.zoomSearch

                }
            }, this.getGeoData);
            if(this.state.map){
                this.state.map.setCenter([position.coords.longitude, position.coords.latitude]);
                this.state.map.setZoom(c_map.zoomSearch);
            }

        }, error => {
            alert('Could not get current location, '  + error.code + ': ' + error.message);
        }, {enableHighAccuracy: true});
    }



    async getGeoData(){
        window.clearTimeout(this.updateGeoData);
        console.log("getGeoData");

        if(this.state.partyMode){

            this.setState({
                visualsParameter: {
                    brightness:         (Math.random()+0.01).toFixed(3),
                    urban:              (Math.random()+0.01).toFixed(3),
                    water:              (Math.random()+0.01).toFixed(3),
                    structureSize:      (Math.random()+0.01).toFixed(3),
                    hilly:              (Math.random()+0.01).toFixed(3)
                }
            });

            //Call again in 20sec
            this.updateGeoData    = window.setTimeout(() => this.getGeoData(), 20000 );

        }else{

            document.getElementsByTagName("body")[0].style.cursor = 'wait';

            // Normal Mode
            // Get position of sun for brightness parameter
            let brightness;
            let currentDate     = new Date();
            let currentTime     = currentDate.getHours()*60 + currentDate.getMinutes();

            let times           = SunCalc.getTimes(currentDate, this.state.currentLocation.lat, this.state.currentLocation.lng);
            let sunrise         = times.sunrise.getHours() * 60 + times.sunrise.getMinutes();
            let sunsetStart     = times.sunsetStart.getHours() * 60 + times.sunsetStart.getMinutes();
            let sunPeak         = ((sunsetStart - sunrise + 60 ) / 2) + sunrise + 60;

            // Boundaries for the daily routine
            let sunriseStart    = sunrise;
            let sunriseEnd      = sunrise + c_data_mapping.sunriseMinutes;
            let morningEnd      = sunPeak - c_data_mapping.middayMinutes;
            let middayEnd       = sunPeak + c_data_mapping.middayMinutes;
            let afternoonEnd    = sunsetStart;
            let sunsetEnd       = sunsetStart + c_data_mapping.sunsetMinutes;


            // Map it to the right value
            if(currentTime >= sunriseStart && currentTime <= sunriseEnd){
                //Sunrise
                brightness = this.projectValToInterval(
                    currentTime,
                    sunriseStart,
                    sunriseEnd,
                    c_data_mapping.visualsValMin,
                    c_data_mapping.visualsValMax / 3);

            }else if(currentTime > sunriseEnd && currentTime <= morningEnd){
                //Morning
                brightness = this.projectValToInterval(
                    currentTime,
                    sunriseEnd,
                    morningEnd,
                    c_data_mapping.visualsValMax / 3,
                    c_data_mapping.visualsValMax);

            }else if(currentTime > morningEnd && currentTime <= middayEnd){
                //Midday
                brightness = c_data_mapping.visualsValMax;

            }else if(currentTime > middayEnd && currentTime <= afternoonEnd){
                //Afternoon
                brightness = this.projectValToInterval(
                    currentTime,
                    middayEnd,
                    afternoonEnd,
                    c_data_mapping.visualsValMax,
                    c_data_mapping.visualsValMax / 3
                );

            }else if(currentTime > afternoonEnd && currentTime <= sunsetEnd){
                //Sunset
                brightness = this.projectValToInterval(
                    currentTime,
                    afternoonEnd,
                    sunsetEnd,
                    c_data_mapping.visualsValMax / 3,
                    c_data_mapping.visualsValMin
                );

            }else{
                //Night
                brightness = c_data_mapping.visualsValMin;
            }

            // Get Information for hilly, urban, water & structureSize parameters
            //Setup url for TileQueryAPI
            let streetQuery     =   c_map.queryStreets + this.state.currentLocation.lng + ',' + this.state.currentLocation.lat;
            let terrainQuery    =   c_map.queryTerrain + this.state.currentLocation.lng + ',' + this.state.currentLocation.lat;

            let buildingQuery   =   streetQuery + c_map.filterPolyBuilding + c_map.token;
            let waterQuery      =   streetQuery + c_map.filterPolyWater + c_map.token;
            let roadQuery       =   streetQuery + c_map.filterLineRoad + c_map.token;
            let contourQuery    =   terrainQuery + c_map.filterPolyContour + c_map.token;

            let queryArray      = [buildingQuery, waterQuery, roadQuery, contourQuery];

            // For parameter mapping
            let parameter       = [];

            for (let i = 0; i< queryArray.length; i++) {
                let response = await fetch(queryArray[i]);
                if(response.ok){
                    let data = await response.json();
                    let allFeatures = data.features;
                    let density         = [0,0,0,0];

                    // calculate density
                    if(allFeatures.length > 0){
                        let distances = [];

                        // Get all distances
                        allFeatures.forEach(feature => {
                            distances.push(feature.properties.tilequery.distance)
                        });

                        // Get maximum distance
                        let max = Math.max(...distances);
                        if (max <= 0){
                            max = 1;
                        }

                        // calculate density
                        density[i] = allFeatures.length / max;
                    }

                    // Get rid of to high and to low values by setting dem to min or max
                    // The Value range goes from 0.001 to 50. It gets set to be from 0.01 to 0.5 - research
                    // The water Value needs special treatment, because of the less value count it gets multiplied by 100
                    if(i === 1 ){
                        density[i] = density[i] * c_data_mapping.balancingWater
                    }
                    if(density[i] < c_data_mapping.queryValMin){
                        density[i] = c_data_mapping.queryValMin;
                    }else if(density[i] > c_data_mapping.queryValMax){
                        density[i] = c_data_mapping.queryValMax;
                    }

                    // Map to geo-parameter from 0.01 to 1
                    parameter.push(this.projectValToInterval(density[i],
                        c_data_mapping.queryValMin,
                        c_data_mapping.queryValMax,
                        c_data_mapping.visualsValMin,
                        c_data_mapping.visualsValMax));

                }else{
                    alert('HTTP-Error: ' + response.status + ', Could not load geodata');
                }
            }

            this.setState({
                visualsParameter: {
                    brightness:         brightness.toFixed(3),
                    urban:              parameter[0].toFixed(3),
                    water:              parameter[1].toFixed(3),
                    structureSize:      parameter[2].toFixed(3),
                    hilly:              parameter[3].toFixed(3)
                }
            });

            document.getElementsByTagName("body")[0].style.cursor = 'default';

            //Call again in 5min
            this.updateGeoData    = window.setTimeout(() => this.getGeoData(), c_data_mapping.updateDuration );
        }
    }


    projectValToInterval(oldVal, oldMin, oldMax, newMin, newMax){
        let m = (newMax - newMin)/(oldMax - oldMin);
        let n = - ( m * oldMin ) + newMin;
        return oldVal * m +n;
    }



  render(){
    return (
        <div className="rootContainer" onMouseMove={() => this.handleMouseEvent()}>

            {this.state.start? '' :
                <StartScreen
                    start                   = {() => this.start()}
                    microphoneInput         = {this.state.microphoneInput}
                    locationDetection       = {this.state.locationDetection}
                    eventHandler            = {(event) => this.handleInputEvent(event)}
                />
            }

            <div className="interface" id={this.state.visibleInterface ? null : 'fadeOut'}>
                <TopBar
                    openSettings        = {() => this.toggleSettings()}
                    showInterfaceCom    = {this.state.showInterfaceCom}
                />
                <Settings
                    config              = {c_settings}
                    visible             = {this.state.visibleSettings}

                    microphoneInput     = {this.state.microphoneInput}
                    audio               = {this.state.audio}
                    autoSensitivity     = {this.state.autoSensitivity}
                    micSensitivity      = {this.state.micSensitivity}

                    locationDetection   = {this.state.locationDetection}
                    currentLocation     = {this.state.currentLocation}
                    setLocation         = {(la, ln, z) => this.setLocation(la, ln, z)}
                    getMap              = {(map) => this.getMap(map)}

                    partyMode           = {this.state.partyNode}
                    projectionMode      = {this.state.projectionMode}

                    closeSettings       = {() => this.toggleSettings()}
                    eventHandler        = {(event) => this.handleInputEvent(event)}
                />
                <BottomBar
                    audioData           = {this.state.waveAudioData}
                    audio               = {this.state.audio}
                    play                = {this.state.play}
                    eventHandler        = {(event) => this.handleInputEvent(event)}
                    showInterfaceCom    = {this.state.showInterfaceCom}
                />

                {/*}
                <DevelopInfo
                    eventHandler    = {(event) => this.handleDevEvent(event)}
                    intensity       = {this.state.visualsParameter.intensity}
                    brightness      = {this.state.visualsParameter.brightness}
                    hilly           = {this.state.visualsParameter.hilly}
                    water           = {this.state.visualsParameter.water}
                    urban           = {this.state.visualsParameter.urban}
                    structureSize   = {this.state.visualsParameter.structureSize}
                    visualsMount    = {this.state.visualsParameter.visualsMount}
                    speed           = {this.state.speed}
                />

{*/}

            </div>

            {/*}
            {this.state.visualsMount?
                                <VisualsRoot
                                    className           = "visualsRoot"
                                    visualsParameter    = {this.state.visualsParameter}
                                    projectionMode      = {this.state.projectionMode}
                                    changeVisuals       = {this.state.changeVisuals}
                                    stopReload          = {() => this.stopReload()}
                                    play                = {this.state.play}
                                    speed               = {this.state.speed}
                                    avg                 = {this.state.avg}
                                    config              = {c_visuals_data}
                                    projectValToInterval= {(oldVal, oldMin, oldMax, newMin, newMax) =>
                                                          this.projectValToInterval(oldVal, oldMin, oldMax, newMin, newMax)}
                                />
                                : ''}
{*/}

            {this.state.audio ? <div>
                                <AudioAnalyser
                                    audio               = {this.state.audio}
                                    sendAudioData       = {(data, wave, speed, avg) => this.setAudioData(data, wave, speed, avg)}
                                    autoSensitivity     = {this.state.autoSensitivity}
                                    micSensitivity      = {this.state.micSensitivity}
                                    adjustSensitivity   = {(value) => this.adjustMicSensitivity(value)}
                                    configData          = {c_audio_data}
                                />


                    {/*}
                                <BarVisualizer
                                    className       = "barVisualiser"
                                    audioData       = {this.state.barAudioData}
                                />
                    {*/}
                                </div>
                                : ''
            }

            {this.state.start ?
                <VisualsRoot
                    className           = "visualsRoot"
                    visualsParameter    = {this.state.visualsParameter}
                    projectionMode      = {this.state.projectionMode}
                    changeVisuals       = {this.state.changeVisuals}
                    stopReload          = {() => this.stopReload()}
                    play                = {this.state.play}
                    speed               = {this.state.speed}
                    avg                 = {this.state.avg}
                    config              = {c_visuals_data}
                    projectValToInterval= {(oldVal, oldMin, oldMax, newMin, newMax) =>
                        this.projectValToInterval(oldVal, oldMin, oldMax, newMin, newMax)}
                />
                : ''
            }



        </div>

    );
  }


}



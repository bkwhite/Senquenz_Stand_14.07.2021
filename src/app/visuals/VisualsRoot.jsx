import React                from 'react';
import * as THREE           from 'three';
import {EffectComposer}     from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass}         from 'three/examples/jsm/postprocessing/RenderPass';
import {AfterimagePass}     from 'three/examples/jsm/postprocessing/AfterimagePass';

import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

import {SceneA}             from './scenes/SceneA';
import {SceneB}             from './scenes/SceneB';
import {SceneC}             from './scenes/SceneC';
import {SceneD}             from './scenes/SceneD';


export class VisualsRoot extends React.Component {
    constructor(props) {
        super(props);
        this.config         = props.config;
        this.updateScene    = window.setTimeout(() => this.changeScene(), 30000 );
    }

    componentDidMount() {
        this.rootSetup();

        this.currentScene = 2;
        //this.currentScene = Math.round(Math.random()*3);
        this.loadScene(this.currentScene);

        this.startAnimationLoop();
        window.addEventListener("resize", this.handleWindowResize);
    }

    componentWillUnmount() {
        this.allScenes[this.currentScene].delete();
        this.composer.removePass(this.renderPass);
        this.composer.removePass(this.afterimagePass);
        window.removeEventListener("resize", this.handleWindowResize);
        window.cancelAnimationFrame(this.requestID);
        window.clearTimeout(this.updateScene);

        //this.controls.dispose();
    }


    rootSetup = () => {
        const width = this.el.clientWidth;
        const height = this.el.clientHeight;

        this.camera = new THREE.PerspectiveCamera(
            this.config.camera.fov,
            width / height,
            this.config.camera.near,
            this.config.camera.far
        );

        this.camera.position.z = 100;
        this.camera.lookAt(0, 0, 0);

        //this.controls = new OrbitControls( this.camera, this.el );

        // Setup Scenes
        this.allScenes = [
            new SceneA(this.config.sceneA),
            new SceneB(this.config.sceneB),
            new SceneC(this.config.sceneC),
            new SceneD(this.config.sceneD)
        ]

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(width, height);
        this.el.appendChild(this.renderer.domElement);

        // Motion blur Effect
        this.composer = new EffectComposer( this.renderer);
    };

    setupColors = (mode) =>{
        const c_colors      = this.config.colors;
        const c_hueRange    = c_colors.hueRange;
        let brightness      = this.props.visualsParameter.brightness;

        let saturation, lightness, backgroundColor, colorA, colorB, colorC;

        if(mode === "sw"){
            // Greyscale setup
            let mainHue = Math.round(this.props.projectValToInterval(
                brightness,
                c_colors.dataMin,
                c_colors.dataMax,
                0,
                180
            ));

            //Background black or white
            saturation = 0;
            if(this.props.visualsParameter.brightness > 0.3){
                lightness = 100;
            }else{
                lightness = 0;
            }
            backgroundColor = new THREE.Color("hsl("+ mainHue +","+ saturation + "%," + lightness + "%)");

            // Colors in selected Area
            saturation  = c_colors.colorSatMax;
            lightness   = Math.round(this.props.projectValToInterval(
                brightness,
                c_colors.dataMin,
                c_colors.dataMax,
                20,
                75
            ));

            // Color A
            // Map color from selected area to real color wheel
            let hueA    = this.checkColorAngle(240 + mainHue, c_hueRange);
            colorA      = new THREE.Color("hsl("+ hueA +","+ saturation + "%," + lightness + "%)");

            // Color B
            let hueB    = mainHue + Math.round(Math.random()*80);
            hueB        = this.checkColorAngle(hueB, 180);
            hueB        = this.checkColorAngle(240 + hueB, c_hueRange);
            colorB      = new THREE.Color("hsl("+hueB+","+ saturation + "%," + lightness + "%)");

            // Color C
            let hueC    = mainHue - Math.round(Math.random()*80);
            hueC        = this.checkColorAngle(hueC, 180);
            hueC        = this.checkColorAngle(240 + hueC, c_hueRange);
            colorC      = new THREE.Color("hsl("+hueC+","+ saturation + "%," + lightness + "%)");


        }else if(mode === "color"){
            // Colorful setup
            // Background color, selected color area, min = blue, max = yellow
            let hueBack = Math.round(this.props.projectValToInterval(
                brightness,
                c_colors.dataMin,
                c_colors.dataMax,
                0,
                180
            ));

            // Random staring hue for other colors, inside selected color area
            let hueRandom         = Math.round(Math.random()*180);
            // Check if new color is to close to background color
            if(hueRandom > this.checkColorAngle(hueBack+30, 180) && hueRandom < this.checkColorAngle(hueBack-30, 180)){
                hueRandom += 30;
            }
            hueRandom = this.checkColorAngle(hueRandom, 180);

            //Background
            if(brightness < c_colors.setBlackAt){
                saturation  = 0;
                lightness   = 0;
            }else{
                saturation  = c_colors.colorSatMax;

                // red tones less saturation
                if( brightness <= 0.7 && brightness > 0.3) {
                    saturation = Math.round(this.props.projectValToInterval(
                        brightness,
                        c_colors.dataMin,
                        c_colors.dataMax,
                        80,
                        50
                    ));
                }

                lightness   = Math.round(this.props.projectValToInterval(
                    brightness,
                    c_colors.dataMin,
                    c_colors.dataMax,
                    10,
                    80
                ));
                // Map color from selected area to real color wheel
                hueBack = this.checkColorAngle(240 + hueBack, c_hueRange);
            }
            backgroundColor = new THREE.Color("hsl("+hueBack+","+ saturation + "%," + lightness + "%)");


            //Colors
            saturation = c_colors.colorSatMax;
            lightness = Math.round(this.props.projectValToInterval(
                brightness,
                c_colors.dataMin,
                c_colors.dataMax,
                c_colors.colorLiMin,
                c_colors.colorLiMax
            ));

            // Color A
            let hueA    = hueRandom;
            hueA        = this.checkColorAngle(240 + hueA, c_hueRange);
            colorA  = new THREE.Color("hsl("+hueA+","+ saturation + "%," + lightness + "%)");

            // Color B
            let hueB    = hueRandom + 30;
            hueB        = this.checkColorAngle(hueB, 180);
            hueB        = this.checkColorAngle(240 + hueB, c_hueRange);
            colorB  = new THREE.Color("hsl("+hueB+","+ saturation + "%," + lightness + "%)");

            // Color C
            let hueC    = hueRandom + 60;
            hueC        = this.checkColorAngle(hueC, 180);
            hueC        = this.checkColorAngle(240 + hueC, c_hueRange);
            colorC  = new THREE.Color("hsl("+hueC+","+ saturation + "%," + lightness + "%)");
        }

        if(this.props.projectionMode){
            backgroundColor = new THREE.Color("hsl(0, 0%, 0%)");
        }

        return {backgroundColor, colorA, colorB, colorC}
    }

    checkColorAngle(val, maxRange){
        if(val > maxRange){
            val -= maxRange;
        }else if (val < 0){
            val += maxRange;
        }
        return val;
    }

    loadScene = (index) => {
        let colorMode = this.setupColors(this.allScenes[index].colorMode);
        this.allScenes[index].load(this.props.visualsParameter, colorMode);

        if(this.renderPass){
            this.composer.removePass(this.renderPass);
            this.composer.removePass(this.afterimagePass);
        }


        //postprocessing (water parameter)
        this.renderPass = new RenderPass(this.allScenes[index].scene, this.camera)
        this.composer.addPass( this.renderPass);
        this.afterimagePass = new AfterimagePass(this.props.visualsParameter.water * this.config.effects.maxBlur +
                                                this.config.effects.minBlur);
        this.composer.addPass(this.afterimagePass);
    };

    changeScene = () => {
        window.clearTimeout(this.updateScene);

        let indexNew = this.nextScene();

        this.loadScene(indexNew);
        this.allScenes[this.currentScene].delete();
        this.currentScene   = indexNew;

        this.updateScene    = window.setTimeout(() => this.changeScene(), 30000 );
    }

    nextScene(){
        let indexNew = Math.floor(Math.random()*3);
        if( indexNew === this.currentScene){
            indexNew = this.nextScene();
        }
        return indexNew
    }

    startAnimationLoop = () => {
        if(this.props.play){
            this.allScenes[this.currentScene].onRender(this.props.speed, this.props.avg);
            this.composer.render();
        }

        if(this.props.changeVisuals){
            this.changeScene();
            this.props.stopReload();
        }


        this.requestID = window.requestAnimationFrame(this.startAnimationLoop);
    };

    handleWindowResize = () => {
        const width  = this.el.clientWidth;
        const height = this.el.clientHeight;

        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.composer.setSize(width, height);

        // Note that after making changes to most of camera properties you have to call
        // .updateProjectionMatrix for the changes to take effect.
        this.camera.updateProjectionMatrix();
    };

    render() {
        return <div className={this.props.className} ref={ref => (this.el = ref)} />;
    }
}




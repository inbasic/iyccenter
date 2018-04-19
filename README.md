## YouTube Control Center (iyccenter)
YouTube Control Center provides a set of useful tools for [YouTube.com](http://www.youtube.com).

### General information
To compile iyccenter project you need to have these packages and libraries installed:
* [python](http://www.python.org/getit/)
* [nodejs](http://nodejs.org/)
* [Mozilla addon-sdk](https://addons.mozilla.org/en-US/developers/builder)
  
Folders description:
* src: source code
* compile: nodejs compiler
* ../addon-sdk-*: latest version of [Mozilla addon-sdk](https://addons.mozilla.org/en-US/developers/builder).
* preview: screenshots
* template: bootstrap folder

  > By default, the addon-sdk folder is assumed to be one directory above the project. This can be modified using the ``--sdk`` parameter.

### How to compile this project:
1. Open a new terminal in the root dir (directory contains src, preview, template, and compile folders)
2. Run ``npm install`` to acquire the necessary nodejs packages
3. Run ``node compile/install.js`` to run iyccenter in a new Firefox profile  
   To make the xpi run ``node compile/install.js --xpi``  
   For more options use ``node compile/install.js --help``  

### How to try the pre-compiled latest version:
1. Select the right branch
2. Browse the src directory
3. Download the raw *.xpi file
4. Drag and drop it into Firefox

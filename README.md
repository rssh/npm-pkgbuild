[![npm](https://img.shields.io/npm/v/npm-pkgbuild.svg)](https://www.npmjs.com/package/npm-pkgbuild)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![minified size](https://badgen.net/bundlephobia/min/npm-pkgbuild)](https://bundlephobia.com/result?p=npm-pkgbuild)
[![downloads](http://img.shields.io/npm/dm/npm-pkgbuild.svg?style=flat-square)](https://npmjs.org/package/npm-pkgbuild)
[![GitHub Issues](https://img.shields.io/github/issues/arlac77/npm-pkgbuild.svg?style=flat-square)](https://github.com/arlac77/npm-pkgbuild/issues)
[![Build Status](https://secure.travis-ci.org/arlac77/npm-pkgbuild.png)](http://travis-ci.org/arlac77/npm-pkgbuild)
[![codecov.io](http://codecov.io/github/arlac77/npm-pkgbuild/coverage.svg?branch=master)](http://codecov.io/github/arlac77/npm-pkgbuild?branch=master)
[![Coverage Status](https://coveralls.io/repos/arlac77/npm-pkgbuild/badge.svg)](https://coveralls.io/r/arlac77/npm-pkgbuild)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Known Vulnerabilities](https://snyk.io/test/github/arlac77/npm-pkgbuild/badge.svg)](https://snyk.io/test/github/arlac77/npm-pkgbuild)
[![Greenkeeper](https://badges.greenkeeper.io/arlac77/npm-pkgbuild.svg)](https://greenkeeper.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/arlac77/npm-pkgbuild)

## npm-pkgbuild

create ArchLinux packages from npm packages

# usage

In a package directory execute

```shell
npm-pkgbuild --npm-dist --npm-modules pkgbuild pacman makepkg
```

This will create a PKGBUILD file and execute it
The resulting pkg will contain the package dist content and all production dependencies

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

## Table of Contents

# install

With [npm](http://npmjs.org) do:

```shell
npm install npm-pkgbuild
```

# license

BSD-2-Clause

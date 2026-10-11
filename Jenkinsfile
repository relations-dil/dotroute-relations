pipeline {
    agent any

    stages {
        stage('build') {
            steps {
                sh 'make build'
            }
        }
        stage('test') {
            steps {
                sh 'make test'
            }
        }
        stage('lint') {
            steps {
                sh 'make lint'
            }
        }
        stage('setup') {
            steps {
                sh 'make setup'
            }
        }
        stage('gui build') {
            steps {
                dir('gui') {
                    sh 'make build'
                }
            }
        }
        stage('api build') {
            steps {
                dir('api') {
                    sh 'make build'
                }
            }
        }
        stage('api test') {
            steps {
                dir('api') {
                    sh 'make test'
                }
            }
        }
        stage('api lint') {
            steps {
                dir('api') {
                    sh 'make lint'
                }
            }
        }
    }
}

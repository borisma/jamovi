'use strict';

const _ = require('underscore');
const $ = require('jquery');
const Backbone = require('backbone');
Backbone.$ = $;

const host = require('./host');
const ResultsPanel = require('./resultspanel');

const ResultsView = Backbone.View.extend({
    className: "ResultsView",
    initialize: function(args) {

        this.$el.addClass('silky-results');

        this.$richView = $('<div></div>');
        this.$richView.appendTo(this.$el);
        this.richView = new ResultsPanel({
            el: this.$richView,
            iframeUrl: args.iframeUrl,
            model: this.model,
            mode: 'rich' });

        this.$textView = $('<div></div>');
        this.$textView.appendTo(this.$el);
        this.$textView.addClass('silky-results-panel-hidden');
        this.textView = new ResultsPanel({
            el: this.$textView,
            iframeUrl: args.iframeUrl,
            model: this.model,
            mode: 'text' });

        this.model.settings().on('change:syntaxMode', event => {
            if (event.changed.syntaxMode)
                this.$textView.removeClass('silky-results-panel-hidden');
            else
                this.$textView.addClass('silky-results-panel-hidden');
        });

        this.model.set('resultsSupplier', this);
    },
    showWelcome() {

        this.$welcome = $('<iframe id="main_welcome" \
                name="welcome" \
                sandbox="allow-scripts allow-same-origin" \
                class="silky-welcome-panel" \
                style="overflow: hidden; box-sizing: border-box;" \
                ></iframe>');
        this.$welcome.appendTo(this.$el);

        host.version.then((version) => {
            this.$welcome.attr('src', 'https://jamovi.org/welcome/?v=' + version);
        });

        this.model.analyses().once('analysisResultsChanged', (event) => {
            this.$welcome.addClass('silky-welcome-panel-hidden');
        });
    },
    getAsHTML(options, part) {
        return this.richView.getAsHTML(options, part);
    },
});

module.exports = ResultsView;

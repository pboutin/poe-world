// Vendor
import Service from '@ember/service';
import {service} from '@ember-decorators/service';
import $ from 'jquery';

// Models
import Challenge from 'poe-world/models/challenge';

// Constants
import PRIVATE_API from 'poe-world/constants/private-api';
const CACHE_DURATION = 120000; // 2 minutes

export default class Fetcher extends Service {
  @service('-electron/request')
  electronRequest;

  @service('authentication/setting')
  authenticationSetting;

  _cache = {
    challenges: null,
    timestamp: null
  };

  fetch(leagueId) {
    const timestamp = Date.now();
    const cache = this._cache;
    const account = this.authenticationSetting.account;

    if (cache.challenges && cache.timestamp + CACHE_DURATION > timestamp) return cache.challenges;

    const challenges = this.electronRequest
      .privateFetch(`${PRIVATE_API.PROFILE_BASE_URL}/${account}/challenges/${leagueId}`)
      .then(challengesHtml => {
        return $(challengesHtml)
          .find('.achievement-list > .achievement')
          .map((_, challengeNode) => {
            return this._parseChallenge(challengeNode);
          })
          .toArray();
      });

    this.set('_cache', {
      challenges,
      timestamp
    });

    return challenges;
  }

  _parseChallenge(challengeNode) {
    const $challenge = $(challengeNode);

    const completionValue = $challenge
      .find('h2.completion-detail')
      .text()
      .trim();

    const [completion, treshold] = this._parseCompletionFrom(completionValue);
    const name = $challenge
      .find('h2:first')
      .text()
      .trim();
    const description = $challenge
      .find('.detail > span.text')
      .text()
      .trim();

    return Challenge.create({
      name,
      description,
      completed: !$challenge.hasClass('incomplete'),
      subChallenges: this._parseSubChallenges($challenge.find('span.items > ul > li')),
      completion: completion || 0,
      treshold: treshold || 1
    });
  }

  _parseSubChallenges(subChallengeNodes) {
    if (!subChallengeNodes) return [];

    return subChallengeNodes
      .map((_, subChallenge) => {
        const $subChallenge = $(subChallenge);
        const fullDescription = $subChallenge.text().trim();
        const [completion, treshold] = this._parseCompletionFrom(fullDescription);

        return Challenge.create({
          name: null,
          description: fullDescription.replace(/ \(\d+\/\d+\)/, ''),
          completed: $subChallenge.hasClass('finished'),
          subChallenges: [],
          completion: completion || 0,
          treshold: treshold || 1
        });
      })
      .toArray();
  }

  _parseCompletionFrom(textValue) {
    const completionMatch = textValue.match(/([\d\,]+)\/([\d\,]+)/);
    if (!completionMatch) return [null, null];

    return [this._parseCompletionValue(completionMatch[1]), this._parseCompletionValue(completionMatch[2])];
  }

  _parseCompletionValue(value) {
    return parseInt(value.replace(/\D+/g, ''), 10);
  }
}

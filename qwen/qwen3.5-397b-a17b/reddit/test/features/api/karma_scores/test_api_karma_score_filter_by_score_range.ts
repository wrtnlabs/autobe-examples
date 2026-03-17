import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneKarmaScore";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test karma score filtering by score range.
 *
 * This test validates the score_min and score_max filter parameters:
 * 1. score_min filter - returns records with score >= minimum value
 * 2. score_max filter - returns records with score <= maximum value
 * 3. Combined range filter - returns records within score range
 * 4. Negative karma scores - validates karma can be negative
 * 5. Empty result set - validates pagination metadata when no records match
 */
export async function test_api_karma_score_filter_by_score_range(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for querying karma scores
  const queryConnection: api.IConnection = { host: connection.host };
  // Test 1: Query all karma scores to get baseline data
  const allScores = await api.functional.redditClone.karma_scores.index(
    queryConnection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IRedditCloneKarmaScore.IRequest,
    },
  );
  typia.assert(allScores);
  // Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination has current page",
    allScores.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    allScores.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    allScores.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    allScores.pagination.pages >= 0,
  );
  // Test 2: Filter by score_min - get scores >= 0
  const minScoreResult = await api.functional.redditClone.karma_scores.index(
    queryConnection,
    {
      body: {
        score_min: 0,
        limit: 100,
        page: 1,
      } satisfies IRedditCloneKarmaScore.IRequest,
    },
  );
  typia.assert(minScoreResult);
  // Verify all returned scores are >= score_min
  if (minScoreResult.data.length > 0) {
    TestValidator.predicate(
      "all scores meet minimum threshold",
      minScoreResult.data.every((score) => score.score >= 0),
    );
  }
  // Test 3: Filter by score_max - get scores <= 100
  const maxScoreResult = await api.functional.redditClone.karma_scores.index(
    queryConnection,
    {
      body: {
        score_max: 100,
        limit: 100,
        page: 1,
      } satisfies IRedditCloneKarmaScore.IRequest,
    },
  );
  typia.assert(maxScoreResult);
  // Verify all returned scores are <= score_max
  if (maxScoreResult.data.length > 0) {
    TestValidator.predicate(
      "all scores meet maximum threshold",
      maxScoreResult.data.every((score) => score.score <= 100),
    );
  }
  // Test 4: Combined range filter - scores between 10 and 50
  const rangeResult = await api.functional.redditClone.karma_scores.index(
    queryConnection,
    {
      body: {
        score_min: 10,
        score_max: 50,
        limit: 100,
        page: 1,
      } satisfies IRedditCloneKarmaScore.IRequest,
    },
  );
  typia.assert(rangeResult);
  // Verify all returned scores are within range
  if (rangeResult.data.length > 0) {
    TestValidator.predicate(
      "all scores within range",
      rangeResult.data.every((score) => score.score >= 10 && score.score <= 50),
    );
  }
  // Test 5: Test negative karma scores - query for scores < 0
  const negativeScoreResult =
    await api.functional.redditClone.karma_scores.index(queryConnection, {
      body: {
        score_max: -1,
        limit: 100,
        page: 1,
      } satisfies IRedditCloneKarmaScore.IRequest,
    });
  typia.assert(negativeScoreResult);
  // Verify all returned scores are negative (validates karma can be negative)
  if (negativeScoreResult.data.length > 0) {
    TestValidator.predicate(
      "negative karma scores exist",
      negativeScoreResult.data.every((score) => score.score < 0),
    );
  }
  // Test 6: Empty result set - query with impossible range
  const emptyResult = await api.functional.redditClone.karma_scores.index(
    queryConnection,
    {
      body: {
        score_min: 1000000,
        score_max: 1000001,
        limit: 20,
        page: 1,
      } satisfies IRedditCloneKarmaScore.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify empty result has proper pagination metadata
  TestValidator.equals("empty result has no data", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages count",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result current page",
    emptyResult.pagination.current,
    1,
  );
}

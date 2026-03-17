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

export async function test_api_karma_score_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test default pagination behavior (page 1, limit 20, sorted by created_at descending)
  const request: IRedditCloneKarmaScore.IRequest = {
    page: 1,
    limit: 20,
    sort: "-created_at",
  };
  const response: IPageIRedditCloneKarmaScore.ISummary =
    await api.functional.redditClone.karma_scores.index(connection, {
      body: request,
    });
  // Validate response structure
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // Test with different pagination parameters
  const customRequest: IRedditCloneKarmaScore.IRequest = {
    page: 2,
    limit: 10,
    sort: "-score",
  };
  const customResponse: IPageIRedditCloneKarmaScore.ISummary =
    await api.functional.redditClone.karma_scores.index(connection, {
      body: customRequest,
    });
  typia.assert(customResponse);
  TestValidator.equals("custom page", customResponse.pagination.current, 2);
  TestValidator.equals("custom limit", customResponse.pagination.limit, 10);
  // Test with member_id filter
  if (response.data.length > 0) {
    const memberId = response.data[0].member.id;
    const filteredRequest: IRedditCloneKarmaScore.IRequest = {
      member_id: memberId,
      page: 1,
      limit: 20,
    };
    const filteredResponse: IPageIRedditCloneKarmaScore.ISummary =
      await api.functional.redditClone.karma_scores.index(connection, {
        body: filteredRequest,
      });
    typia.assert(filteredResponse);
    // All returned records should belong to the filtered member
    for (const karmaScore of filteredResponse.data) {
      TestValidator.equals(
        "filtered by member_id",
        karmaScore.member.id,
        memberId,
      );
    }
  }
  // Test with score range filter
  const scoreRangeRequest: IRedditCloneKarmaScore.IRequest = {
    score_min: 0,
    score_max: 1000,
    page: 1,
    limit: 20,
  };
  const scoreRangeResponse: IPageIRedditCloneKarmaScore.ISummary =
    await api.functional.redditClone.karma_scores.index(connection, {
      body: scoreRangeRequest,
    });
  typia.assert(scoreRangeResponse);
  // All returned records should be within score range
  for (const karmaScore of scoreRangeResponse.data) {
    TestValidator.predicate("score >= min", karmaScore.score >= 0);
    TestValidator.predicate("score <= max", karmaScore.score <= 1000);
  }
}

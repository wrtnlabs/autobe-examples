import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaScore";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsKarmaScore";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_karma_scores_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate test data: join a new member
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member);
  // Update memberConnection with the auth token
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = memberConnection.headers;
  // Define a test time range (5 days ago to 1 day ago)
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  // Define a test score range (0 to 100)
  const scoreFrom = 0;
  const scoreTo = 100;
  // Test with complex filtering combined
  const testComplexFilters: ICommunityBbsKarmaScore.IRequest = {
    last_updated_from: fiveDaysAgo.toISOString(),
    last_updated_to: oneDayAgo.toISOString(),
    score_from: scoreFrom,
    score_to: scoreTo,
    user_id: member.id,
    limit: 10,
  };
  // Execute the main API call with combined filters
  const result: IPageICommunityBbsKarmaScore.ISummary =
    await api.functional.communityBbs.member.karma_scores.index(
      authConnection,
      {
        body: testComplexFilters,
      },
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals(
    "pagination should have correct limit",
    result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination should have at least 0 records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have 0 or more pages",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination should have current page greater than 0",
    result.pagination.current > 0,
  );
  // Validate that entries are sorted by lastUpdated in descending order (newest first)
  // We can only validate this if there are multiple entries
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = new Date(result.data[i].lastUpdated);
      const next = new Date(result.data[i + 1].lastUpdated);
      TestValidator.predicate(
        "entries sorted by lastUpdated descending",
        current >= next,
      );
    }
  }
  // Validate that data entries have required properties (only business logic)
  for (const entry of result.data) {
    TestValidator.predicate(
      "score must be a number",
      typeof entry.score === "number",
    );
    TestValidator.predicate(
      "reasonCategory must be a string",
      typeof entry.reasonCategory === "string",
    );
    TestValidator.equals(
      "actorId must match the user_id from filter",
      entry.actorId,
      member.id,
    );
  }
  // Test empty result scenario
  // Use a date range in the future to ensure no results
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365); // 1 year in future
  const emptyTest: ICommunityBbsKarmaScore.IRequest = {
    last_updated_from: futureDate.toISOString(),
    limit: 5,
  };
  const emptyResult: IPageICommunityBbsKarmaScore.ISummary =
    await api.functional.communityBbs.member.karma_scores.index(
      authConnection,
      {
        body: emptyTest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result must have no data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination records should be 0",
    emptyResult.pagination.records,
    0,
  );
}

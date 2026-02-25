import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_vote_karma_impacts_time_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register a user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Define a specific time range for testing
  const startTime = new Date("2024-01-15T00:00:00Z").toISOString();
  const endTime = new Date("2024-01-15T12:00:00Z").toISOString();
  // Query karma impacts with time range filter
  const response =
    await api.functional.communityPlatform.user.vote_karma_impacts.index(
      userConnection,
      {
        body: {
          start_time: startTime,
          end_time: endTime,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(response);
  // Validate response structure
  TestValidator.equals(
    "response has pagination",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    typeof response.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof response.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records count",
    typeof response.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    typeof response.pagination.pages === "number",
  );
  // Validate that pagination values are reasonable
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is reasonable",
    response.pagination.limit > 0 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate each returned record has proper structure
  for (const record of response.data) {
    typia.assert(record);
    // Validate karma impact record structure
    TestValidator.predicate(
      "record has valid karma delta",
      record.karma_delta === 1 || record.karma_delta === -1,
    );
    TestValidator.predicate(
      "record has valid created_at timestamp",
      typeof record.created_at === "string" &&
        !isNaN(new Date(record.created_at).getTime()),
    );
    // Validate user information structure
    TestValidator.predicate(
      "record has user info",
      typeof record.user === "object",
    );
    TestValidator.predicate("user has id", typeof record.user.id === "string");
    TestValidator.predicate(
      "user has username",
      typeof record.user.username === "string",
    );
    TestValidator.predicate(
      "user has display_name",
      record.user.display_name === null ||
        typeof record.user.display_name === "string",
    );
    TestValidator.predicate(
      "user has avatar_url",
      record.user.avatar_url === null ||
        typeof record.user.avatar_url === "string",
    );
    TestValidator.predicate(
      "user has karma score",
      typeof record.user.karma === "number",
    );
    TestValidator.predicate(
      "user has created_at timestamp",
      typeof record.user.created_at === "string" &&
        !isNaN(new Date(record.user.created_at).getTime()),
    );
  }
  // Test edge case: empty time range (end_time before start_time)
  const emptyRangeResponse =
    await api.functional.communityPlatform.user.vote_karma_impacts.index(
      userConnection,
      {
        body: {
          start_time: endTime,
          end_time: startTime, // intentionally reversed
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(emptyRangeResponse);
  // Empty time range should return empty results
  TestValidator.equals(
    "empty time range returns empty data",
    emptyRangeResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty time range has zero records",
    emptyRangeResponse.pagination.records,
    0,
  );
}

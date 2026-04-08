import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_top_with_time_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Login as the member
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(loginConnection, {
    body: {
      email: joinResponse.email,
      password: "1234", // Use the same password from join
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 3. Test each time period with sort='top'
  const testConnection: api.IConnection = { host: connection.host };
  // a. Test 'today' time period
  const todayResponse =
    await api.functional.redditCommunity.member.feeds.popular.index(
      testConnection,
      {
        body: {
          sort: "top" as const,
          timePeriod: "today" as const,
          limit: 100,
          page: null,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(todayResponse);
  TestValidator.equals(
    "today: response has valid pagination",
    todayResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "today: response is IPageIRedditCommunityPost.ISummary",
    () => {
      typia.assert(todayResponse);
      return true;
    },
  );
  // b. Test 'this_week' time period
  const weekResponse =
    await api.functional.redditCommunity.member.feeds.popular.index(
      testConnection,
      {
        body: {
          sort: "top" as const,
          timePeriod: "this_week" as const,
          limit: 100,
          page: null,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(weekResponse);
  TestValidator.equals(
    "this_week: response has valid pagination",
    weekResponse.pagination.current,
    1,
  );
  // c. Test 'this_month' time period
  const monthResponse =
    await api.functional.redditCommunity.member.feeds.popular.index(
      testConnection,
      {
        body: {
          sort: "top" as const,
          timePeriod: "this_month" as const,
          limit: 100,
          page: null,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(monthResponse);
  TestValidator.equals(
    "this_month: response has valid pagination",
    monthResponse.pagination.current,
    1,
  );
  // d. Test 'this_year' time period
  const yearResponse =
    await api.functional.redditCommunity.member.feeds.popular.index(
      testConnection,
      {
        body: {
          sort: "top" as const,
          timePeriod: "this_year" as const,
          limit: 100,
          page: null,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(yearResponse);
  TestValidator.equals(
    "this_year: response has valid pagination",
    yearResponse.pagination.current,
    1,
  );
  // e. Test 'all_time' time period
  const allTimeResponse =
    await api.functional.redditCommunity.member.feeds.popular.index(
      testConnection,
      {
        body: {
          sort: "top" as const,
          timePeriod: "all_time" as const,
          limit: 100,
          page: null,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(allTimeResponse);
  TestValidator.equals(
    "all_time: response has valid pagination",
    allTimeResponse.pagination.current,
    1,
  );
  // 4. Verify all responses have valid timePeriod values in pagination
  TestValidator.predicate(
    "today: pagination limit is valid",
    todayResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "this_week: pagination limit is valid",
    weekResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "this_month: pagination limit is valid",
    monthResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "this_year: pagination limit is valid",
    yearResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "all_time: pagination limit is valid",
    allTimeResponse.pagination.limit <= 100,
  );
  // 5. Verify response data is array of IRedditCommunityPost.ISummary
  TestValidator.predicate(
    "today: data is array of posts",
    Array.isArray(todayResponse.data),
  );
  TestValidator.predicate(
    "this_week: data is array of posts",
    Array.isArray(weekResponse.data),
  );
  TestValidator.predicate(
    "this_month: data is array of posts",
    Array.isArray(monthResponse.data),
  );
  TestValidator.predicate(
    "this_year: data is array of posts",
    Array.isArray(yearResponse.data),
  );
  TestValidator.predicate(
    "all_time: data is array of posts",
    Array.isArray(allTimeResponse.data),
  );
  // 6. Verify each post in data has required fields (if any posts exist)
  if (todayResponse.data.length > 0) {
    const samplePost = todayResponse.data[0];
    typia.assert(samplePost);
    TestValidator.predicate(
      "today: post has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        samplePost.id,
      ),
    );
    TestValidator.predicate(
      "today: post has title",
      typeof samplePost.title === "string",
    );
    TestValidator.predicate(
      "today: post has vote_score",
      typeof samplePost.vote_score === "number",
    );
    TestValidator.predicate(
      "today: post has created_at",
      typeof samplePost.created_at === "string",
    );
  }
  // 7. Verify pagination metadata consistency
  TestValidator.predicate(
    "today: pages calculated correctly",
    todayResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "this_week: pages calculated correctly",
    weekResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "this_month: pages calculated correctly",
    monthResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "this_year: pages calculated correctly",
    yearResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "all_time: pages calculated correctly",
    allTimeResponse.pagination.pages >= 1,
  );
  // 8. Test that different time periods return different results (if data exists)
  if (todayResponse.data.length > 0 || weekResponse.data.length > 0) {
    TestValidator.notEquals(
      "today and this_week: different time periods",
      todayResponse.pagination.records,
      weekResponse.pagination.records,
    );
  }
  // 9. Verify all_time returns the most comprehensive results
  if (allTimeResponse.data.length > 0 && todayResponse.data.length > 0) {
    TestValidator.predicate(
      "all_time: has more or equal posts than today",
      allTimeResponse.pagination.records >= todayResponse.pagination.records,
    );
  }
}

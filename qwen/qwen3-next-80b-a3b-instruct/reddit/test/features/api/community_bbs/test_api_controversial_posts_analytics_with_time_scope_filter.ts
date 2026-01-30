import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPostControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostControversialScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPostControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPostControversialScore";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_controversial_posts_analytics_with_time_scope_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to access protected analytics endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  // Helper function to create connection with proper URL including query parameters
  const createConnectionWithTimeScope = (
    timeScope: string,
  ): api.IConnection => {
    // Create URL with the endpoint and query parameter
    const url = new URL(
      "/communityBbs/member/analytics/posts/controversial",
      memberConnection.host,
    );
    url.searchParams.set("time_scope", timeScope);
    const fullUrl = url.toString();
    // Create a new connection with the full URL as host (this is how Nestia expects query params)
    return { host: fullUrl, headers: memberConnection.headers };
  };
  // Step 2: Test time_scope=day - should return only posts from today
  const dayScopeResponse: IPageICommunityBbsPostControversialScore =
    await api.functional.communityBbs.member.analytics.posts.controversial.index(
      createConnectionWithTimeScope("day"),
    );
  typia.assert(dayScopeResponse);
  // Step 3: Test time_scope=week - should return only posts from this week
  const weekScopeResponse: IPageICommunityBbsPostControversialScore =
    await api.functional.communityBbs.member.analytics.posts.controversial.index(
      createConnectionWithTimeScope("week"),
    );
  typia.assert(weekScopeResponse);
  // Step 4: Test time_scope=month - should return only posts from this month
  const monthScopeResponse: IPageICommunityBbsPostControversialScore =
    await api.functional.communityBbs.member.analytics.posts.controversial.index(
      createConnectionWithTimeScope("month"),
    );
  typia.assert(monthScopeResponse);
  // Step 5: Validate response structures and pagination
  TestValidator.equals(
    "day response has pagination",
    dayScopeResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "week response has pagination",
    weekScopeResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "month response has pagination",
    monthScopeResponse.pagination.current,
    1,
  );
  // Step 6: Validate all responses contain ICommunityBbsPostControversialScore objects
  TestValidator.predicate(
    "day data array not empty",
    dayScopeResponse.data.length > 0,
  );
  TestValidator.predicate(
    "week data array not empty",
    weekScopeResponse.data.length > 0,
  );
  TestValidator.predicate(
    "month data array not empty",
    monthScopeResponse.data.length > 0,
  );
  // Step 7: Validate controversy score is non-negative
  TestValidator.predicate(
    "day controversy scores non-negative",
    dayScopeResponse.data.every((item) => item.controversy_score >= 0),
  );
  TestValidator.predicate(
    "week controversy scores non-negative",
    weekScopeResponse.data.every((item) => item.controversy_score >= 0),
  );
  TestValidator.predicate(
    "month controversy scores non-negative",
    monthScopeResponse.data.every((item) => item.controversy_score >= 0),
  );
  // Step 8: Validate created_at is in ISO 8601 format
  TestValidator.predicate(
    "day created_at formats valid",
    dayScopeResponse.data.every((item) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.created_at),
    ),
  );
  TestValidator.predicate(
    "week created_at formats valid",
    weekScopeResponse.data.every((item) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.created_at),
    ),
  );
  TestValidator.predicate(
    "month created_at formats valid",
    monthScopeResponse.data.every((item) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(item.created_at),
    ),
  );
  // Step 9: Validate that different time_scope values produce different data sets
  // This confirms time_scope filtering is actually working
  TestValidator.predicate("day and week responses are different", () => {
    const dayIds = new Set(dayScopeResponse.data.map((item) => item.post_id));
    const weekIds = new Set(weekScopeResponse.data.map((item) => item.post_id));
    // If week includes everything from day, the day set should be a subset of week set
    // If filtering works correctly, day data should be a strict subset of week data
    const hasMoreInWeek =
      weekScopeResponse.data.length > dayScopeResponse.data.length;
    const allDayInWeek = dayScopeResponse.data.every((item) =>
      weekIds.has(item.post_id),
    );
    return hasMoreInWeek && allDayInWeek;
  });
  // Validate month data includes both day and week data
  TestValidator.predicate("month and day responses are different", () => {
    const dayIds = new Set(dayScopeResponse.data.map((item) => item.post_id));
    const monthIds = new Set(
      monthScopeResponse.data.map((item) => item.post_id),
    );
    // Month should be larger than day and contain all day's posts
    const hasMoreInMonth =
      monthScopeResponse.data.length > dayScopeResponse.data.length;
    const allDayInMonth = dayScopeResponse.data.every((item) =>
      monthIds.has(item.post_id),
    );
    return hasMoreInMonth && allDayInMonth;
  });
}

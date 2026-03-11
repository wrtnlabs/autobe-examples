import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_popular_feed_top_sort_time_ranges(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Test 'today' time range
  const todayRequest = {
    sortBy: "top" as const,
    timeRange: "today" as const,
    page: 1,
    limit: 20,
  } satisfies IRedditPlatformPost.IRequest;
  const todayResponse =
    await api.functional.redditPlatform.member.posts.feed.popular.index(
      memberConnection,
      { body: todayRequest },
    );
  typia.assert(todayResponse);
  TestValidator.equals(
    "today time range pagination current",
    todayResponse.pagination.current,
    1,
  );
  // Step 3: Test 'this_week' time range
  const weekRequest = {
    sortBy: "top" as const,
    timeRange: "this_week" as const,
    page: 1,
    limit: 20,
  } satisfies IRedditPlatformPost.IRequest;
  const weekResponse =
    await api.functional.redditPlatform.member.posts.feed.popular.index(
      memberConnection,
      { body: weekRequest },
    );
  typia.assert(weekResponse);
  // Step 4: Test 'this_month' time range
  const monthRequest = {
    sortBy: "top" as const,
    timeRange: "this_month" as const,
    page: 1,
    limit: 20,
  } satisfies IRedditPlatformPost.IRequest;
  const monthResponse =
    await api.functional.redditPlatform.member.posts.feed.popular.index(
      memberConnection,
      { body: monthRequest },
    );
  typia.assert(monthResponse);
  // Step 5: Test 'this_year' time range
  const yearRequest = {
    sortBy: "top" as const,
    timeRange: "this_year" as const,
    page: 1,
    limit: 20,
  } satisfies IRedditPlatformPost.IRequest;
  const yearResponse =
    await api.functional.redditPlatform.member.posts.feed.popular.index(
      memberConnection,
      { body: yearRequest },
    );
  typia.assert(yearResponse);
  // Step 6: Test 'all_time' time range
  const allTimeRequest = {
    sortBy: "top" as const,
    timeRange: "all_time" as const,
    page: 1,
    limit: 20,
  } satisfies IRedditPlatformPost.IRequest;
  const allTimeResponse =
    await api.functional.redditPlatform.member.posts.feed.popular.index(
      memberConnection,
      { body: allTimeRequest },
    );
  typia.assert(allTimeResponse);
  // Step 7: Validate sorting by vote_score DESC within 'all_time' range
  if (allTimeResponse.data.length > 1) {
    for (let i = 0; i < allTimeResponse.data.length - 1; i++) {
      TestValidator.predicate(
        "all_time posts sorted by vote_score DESC",
        () =>
          allTimeResponse.data[i].vote_score >=
          allTimeResponse.data[i + 1].vote_score,
      );
    }
  }
  // Step 8: Validate pagination metadata for all_time
  TestValidator.predicate(
    "all_time pagination records non-negative",
    () => allTimeResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all_time pagination pages non-negative",
    () => allTimeResponse.pagination.pages >= 0,
  );
}

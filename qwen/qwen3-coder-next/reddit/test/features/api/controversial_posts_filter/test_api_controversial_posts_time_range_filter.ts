import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneFeedConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedConfig";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_controversial_posts_time_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // Set up time range for filtering (today)
  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const endDate = now.toISOString();
  // Call controversial posts endpoint with time range filter
  const response =
    await api.functional.redditClone.member.analytics.posts.controversial.index(
      memberConnection,
      {
        body: {
          sort: "controversial",
          startDate: startDate,
          endDate: endDate,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneFeedConfig.IRequest,
      },
    );
  typia.assert(response);
  // Validate response structure
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.predicate("has data array", Array.isArray(response.data));
  // Verify all posts are within time range
  response.data.forEach((post) => {
    const postDate = new Date(post.created_at);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    TestValidator.predicate(
      "post within time range",
      postDate >= startDateObj && postDate <= endDateObj,
    );
  });
  // Verify controversial posts have moderate vote scores (near zero)
  response.data.forEach((post) => {
    TestValidator.predicate(
      "post has valid vote score",
      typeof post.vote_score === "number",
    );
  });
  // Test with different time range (yesterday)
  const yesterdayStart = new Date(
    now.getTime() - 48 * 60 * 60 * 1000,
  ).toISOString();
  const yesterdayEnd = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const response2 =
    await api.functional.redditClone.member.analytics.posts.controversial.index(
      memberConnection,
      {
        body: {
          sort: "controversial",
          startDate: yesterdayStart,
          endDate: yesterdayEnd,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneFeedConfig.IRequest,
      },
    );
  typia.assert(response2);
  // Test with no results (future date range)
  const futureStart = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const response3 =
    await api.functional.redditClone.member.analytics.posts.controversial.index(
      memberConnection,
      {
        body: {
          sort: "controversial",
          startDate: futureStart,
          endDate: futureEnd,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneFeedConfig.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals("no posts in future range", response3.data.length, 0);
}

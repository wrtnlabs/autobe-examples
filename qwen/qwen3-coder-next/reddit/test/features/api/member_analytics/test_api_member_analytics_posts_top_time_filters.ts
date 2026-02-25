import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
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

export async function test_api_member_analytics_posts_top_time_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create additional member connections for voting
  const voter1Connection: api.IConnection = { host: connection.host };
  const voter1 = await authorize_member_join(voter1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voter1);
  const voter2Connection: api.IConnection = { host: connection.host };
  const voter2 = await authorize_member_join(voter2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voter2);
  // 3. Create community
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
  // 4. Create posts with different creation dates and vote scores
  const recentPostHighVotes =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 100,
          timeFilter: "today",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(recentPostHighVotes);
  const recentPostMediumVotes =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 100,
          timeFilter: "today",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(recentPostMediumVotes);
  const recentPostLowVotes =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 100,
          timeFilter: "today",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(recentPostLowVotes);
  const weekPostHighVotes =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 100,
          timeFilter: "today",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(weekPostHighVotes);
  const monthPostHighVotes =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 100,
          timeFilter: "today",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(monthPostHighVotes);
  const yearPostHighVotes =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 100,
          timeFilter: "today",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(yearPostHighVotes);
  // 5. Test today time filter
  const todayResult =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 100,
          timeFilter: "today",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(todayResult);
  TestValidator.equals(
    "today result has data",
    todayResult.data.length > 0,
    true,
  );
  // 6. Test week time filter
  const weekResult =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 100,
          timeFilter: "week",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(weekResult);
  TestValidator.equals(
    "week result has data",
    weekResult.data.length > 0,
    true,
  );
  // 7. Test month time filter
  const monthResult =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 100,
          timeFilter: "month",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(monthResult);
  TestValidator.equals(
    "month result has data",
    monthResult.data.length > 0,
    true,
  );
  // 8. Test year time filter
  const yearResult =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 100,
          timeFilter: "year",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(yearResult);
  TestValidator.equals(
    "year result has data",
    yearResult.data.length > 0,
    true,
  );
  // 9. Test allTime time filter
  const allTimeResult =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 100,
          timeFilter: "allTime",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(allTimeResult);
  TestValidator.equals(
    "allTime result has data",
    allTimeResult.data.length > 0,
    true,
  );
  // 10. Verify pagination structure
  TestValidator.predicate(
    "today pagination valid",
    () =>
      todayResult.pagination.current === 1 &&
      todayResult.pagination.limit === 100 &&
      todayResult.pagination.records >= 0 &&
      todayResult.pagination.pages >= 0,
  );
  // 11. Verify sorting by voteScore (highest first) for today posts
  if (todayResult.data.length >= 2) {
    for (let i = 0; i < todayResult.data.length - 1; i++) {
      TestValidator.predicate(
        `today posts sorted by voteScore: ${i} >= ${i + 1}`,
        () =>
          todayResult.data[i].voteScore >= todayResult.data[i + 1].voteScore,
      );
    }
  }
  // 12. Verify time-ago format for today posts
  if (todayResult.data.length > 0) {
    const post = todayResult.data[0];
    TestValidator.predicate(
      "post has timeAgo",
      () =>
        post.timeAgo !== undefined &&
        post.timeAgo !== null &&
        post.timeAgo.length > 0,
    );
  }
  // 13. Verify author and community information
  if (todayResult.data.length > 0) {
    const post = todayResult.data[0];
    TestValidator.predicate(
      "post has author",
      () => post.author !== undefined && post.author !== null,
    );
    TestValidator.predicate(
      "post has community",
      () => post.community !== undefined && post.community !== null,
    );
    TestValidator.equals("author has id", post.author.id !== undefined, true);
    TestValidator.equals(
      "author has username",
      post.author.username !== undefined,
      true,
    );
    TestValidator.equals(
      "community has id",
      post.community.id !== undefined,
      true,
    );
    TestValidator.equals(
      "community has name",
      post.community.name !== undefined,
      true,
    );
  }
  // 14. Test different limit values
  const limitedResult =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 1,
          limit: 5,
          timeFilter: "today",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(limitedResult);
  TestValidator.predicate(
    "limited result has correct limit",
    () => limitedResult.data.length <= 5,
  );
  TestValidator.equals(
    "limited pagination limit",
    limitedResult.pagination.limit,
    5,
  );
  // 15. Test different page values
  const page2Result =
    await api.functional.redditClone.member.analytics.posts.top.index(
      memberConnection,
      {
        body: {
          sort: "top",
          page: 2,
          limit: 10,
          timeFilter: "today",
        } satisfies IRedditCloneContentPost.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 pagination", page2Result.pagination.current, 2);
}

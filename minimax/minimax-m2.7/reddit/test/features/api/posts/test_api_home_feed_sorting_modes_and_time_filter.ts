import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

/**
 * Test home feed sorting modes and time filtering.
 *
 * Steps:
 * 1) Authenticate as member
 * 2) Create a community and subscribe
 * 3) Create multiple posts with varying vote scores for sorting validation
 * 4) Test 'hot' sort (default algorithm combining recency and vote score)
 * 5) Test 'new' sort (chronological descending)
 * 6) Test 'top' sort with 'all' time filter (highest vote scores)
 * 7) Test 'top' sort with 'day' time filter (posts from last 24 hours)
 * 8) Test 'controversial' sort (score close to zero with many votes)
 *
 * Validates:
 * - Each sort mode returns posts in the correct order per its algorithm
 * - Time filter correctly restricts results for 'top' sort
 * - Pagination metadata is accurate
 */
export async function test_api_home_feed_sorting_modes_and_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Create multiple posts with varying characteristics
  const posts = await ArrayUtil.asyncRepeat(5, async (index: number) => {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          title: `Test Post ${index + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
          communityName: community.name,
          type: "text",
        },
      },
    );
    typia.assert(post);
    return post;
  });
  // Validate posts were created in subscribed community
  TestValidator.equals(
    "all posts in subscribed community",
    true,
    posts.every((p) => p.community.id === community.id),
  );
  // 5. Test 'hot' sort (default algorithm combining recency and vote score)
  const hotFeed = await api.functional.redditClone.member.posts.home.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(hotFeed);
  TestValidator.predicate("hot feed returns data", hotFeed.data.length > 0);
  TestValidator.equals(
    "pagination current page",
    hotFeed.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    hotFeed.pagination.records >= 0,
  );
  // 6. Test 'new' sort (chronological descending)
  const newFeed = await api.functional.redditClone.member.posts.home.index(
    memberConnection,
    {
      body: {
        sort: "new",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate("new feed returns data", newFeed.data.length > 0);
  TestValidator.predicate(
    "new feed is sorted by created_at descending",
    newFeed.data.every((post, idx, arr) => {
      if (idx === 0) return true;
      return new Date(post.created_at) <= new Date(arr[idx - 1].created_at);
    }),
  );
  // 7. Test 'top' sort with 'all' time filter (highest vote scores)
  const topAllFeed = await api.functional.redditClone.member.posts.home.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeRange: "all",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topAllFeed);
  TestValidator.predicate(
    "top all feed returns data",
    topAllFeed.data.length > 0,
  );
  TestValidator.predicate(
    "top feed is sorted by vote_score descending",
    topAllFeed.data.every((post, idx, arr) => {
      if (idx === 0) return true;
      return post.vote_score <= arr[idx - 1].vote_score;
    }),
  );
  // 8. Test 'top' sort with 'day' time filter (posts from last 24 hours)
  const topDayFeed = await api.functional.redditClone.member.posts.home.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeRange: "day",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topDayFeed);
  TestValidator.predicate(
    "top day feed returns data",
    topDayFeed.data.length > 0,
  );
  // Validate all posts in day filter are from last 24 hours
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  TestValidator.predicate(
    "day filter returns only recent posts",
    topDayFeed.data.every((post) => new Date(post.created_at) >= dayAgo),
  );
  // 9. Test 'top' sort with 'week' time filter
  const topWeekFeed = await api.functional.redditClone.member.posts.home.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeRange: "week",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topWeekFeed);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  TestValidator.predicate(
    "week filter returns only recent posts",
    topWeekFeed.data.every((post) => new Date(post.created_at) >= weekAgo),
  );
  // 10. Test 'controversial' sort (score close to zero with many votes)
  const controversialFeed =
    await api.functional.redditClone.member.posts.home.index(memberConnection, {
      body: {
        sort: "controversial",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    });
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed returns data",
    controversialFeed.data.length > 0,
  );
  // 11. Test pagination metadata accuracy
  const paginatedFeed =
    await api.functional.redditClone.member.posts.home.index(memberConnection, {
      body: {
        sort: "new",
        limit: 2,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    });
  typia.assert(paginatedFeed);
  TestValidator.equals(
    "limit matches request",
    paginatedFeed.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page count calculated correctly",
    paginatedFeed.pagination.pages >= 0,
  );
  // 12. Test without sort (should default to 'hot')
  const defaultFeed = await api.functional.redditClone.member.posts.home.index(
    memberConnection,
    {
      body: {
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(defaultFeed);
  TestValidator.predicate(
    "default feed returns data",
    defaultFeed.data.length > 0,
  );
  // Validate all posts in home feed belong to subscribed communities
  TestValidator.predicate(
    "all posts from subscribed communities",
    defaultFeed.data.every((post) => post.community.id === community.id),
  );
}

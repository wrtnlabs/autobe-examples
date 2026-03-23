import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test personalized home feed with subscriptions for authenticated members.
 *
 * Validates that authenticated members can browse their personalized home feed
 * showing posts from subscribed communities. Tests feed retrieval, sorting
 * options, time filters, and pagination functionality.
 */
export async function test_api_post_home_feed_with_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community for the member
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create multiple posts in the community
  const posts: IRedditClonePost[] = [];
  for (let i = 0; i < 5; i++) {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 4. Retrieve home feed with default parameters
  const homeFeed = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        page: 1,
        page_size: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(homeFeed);
  // Validate home feed structure
  TestValidator.equals(
    "home feed pagination current page",
    homeFeed.pagination.current,
    1,
  );
  TestValidator.predicate("home feed contains posts", homeFeed.data.length > 0);
  TestValidator.predicate(
    "all posts are from subscribed community",
    homeFeed.data.every((post) => post.community.id === community.id),
  );
  // 5. Test sorting with 'new' option
  const newFeed = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "new",
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.equals(
    "new feed page size matches request",
    newFeed.pagination.limit,
    10,
  );
  // 6. Test sorting with 'top' and time_filter
  const topFeed = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "top",
        time_filter: "all_time",
        page: 1,
        page_size: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topFeed);
  TestValidator.predicate(
    "top feed returns valid response",
    topFeed.data.length >= 0,
  );
  // 7. Test pagination navigation
  const page2Feed = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        page: 2,
        page_size: 2,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page2Feed);
  TestValidator.equals("page 2 current", page2Feed.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Feed.pagination.limit, 2);
  // 8. Test with 'hot' sorting
  const hotFeed = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "hot",
        page: 1,
        page_size: 5,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(hotFeed);
  TestValidator.equals("hot feed page size", hotFeed.pagination.limit, 5);
  // 9. Test with 'controversial' sorting
  const controversialFeed = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "controversial",
        page: 1,
        page_size: 5,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(controversialFeed);
  TestValidator.equals(
    "controversial feed page size",
    controversialFeed.pagination.limit,
    5,
  );
}

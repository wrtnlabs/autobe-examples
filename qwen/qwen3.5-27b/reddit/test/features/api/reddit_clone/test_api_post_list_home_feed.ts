import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the home feed functionality that displays posts only from communities the authenticated member has subscribed to.
 *
 * Validates that the home feed correctly filters posts to show only content from communities where the member has an active subscription. This test ensures the subscribedOnly parameter in the post list API properly restricts results based on the authenticated user's subscriptions.
 *
 * Special attention is given to verifying that the home feed returns posts from subscribed communities with correct pagination metadata and response structure. The test creates a member, subscribes them to a community, creates posts in that community, and validates the home feed returns those posts.
 *
 * 1. Register and authenticate a new member account.
 * 2. Subscribe the member to a community.
 * 3. Create posts in the subscribed community.
 * 4. Call the post list API with subscribedOnly=true to get home feed.
 * 5. Verify that posts from the subscribed community appear in the results.
 * 6. Validate pagination metadata is accurate.
 * 7. Verify response structure matches IPageIRedditClonePost.ISummary.
 */
export async function test_api_post_list_home_feed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Subscribe the member to a community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  const communityId = subscription.community.id;
  // 3. Create posts in the subscribed community
  const post1 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "First post in subscribed community",
        post_type: "text",
        community_id: communityId,
        text_content: "This is the first test post content",
      },
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Second post in subscribed community",
        post_type: "text",
        community_id: communityId,
        text_content: "This is the second test post content",
      },
    },
  );
  typia.assert(post2);
  // 4. Call the post list API with subscribedOnly=true to get home feed
  const homeFeed = await api.functional.redditClone.posts.index(
    memberConnection,
    {
      body: {
        subscribedOnly: true,
        limit: 25,
        page: 1,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(homeFeed);
  // 5. Verify that posts from the subscribed community appear in the results
  TestValidator.predicate(
    "home feed contains posts from subscribed community",
    homeFeed.data.length > 0,
  );
  TestValidator.equals(
    "all posts in home feed are from subscribed community",
    homeFeed.data.every((post) => post.community.id === communityId),
    true,
  );
  // 6. Validate pagination metadata is accurate
  TestValidator.equals(
    "pagination current page is 1",
    homeFeed.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 25", homeFeed.pagination.limit, 25);
  TestValidator.predicate(
    "pagination records count is non-negative",
    homeFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    homeFeed.pagination.pages >= 0,
  );
  // 7. Verify response structure matches IPageIRedditClonePost.ISummary
  TestValidator.predicate(
    "home feed data array exists",
    Array.isArray(homeFeed.data),
  );
  TestValidator.predicate(
    "each post has required fields",
    homeFeed.data.every(
      (post) =>
        post.id &&
        post.title &&
        post.post_type &&
        post.author &&
        post.community &&
        typeof post.vote_score === "number" &&
        typeof post.comment_count === "number" &&
        post.created_at &&
        post.preview,
    ),
  );
}

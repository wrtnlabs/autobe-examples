import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Validates home feed filtering based on active community subscriptions.
 *
 * Tests the complete workflow where a member registers, creates a community, subscribes to it, publishes posts within it, and then retrieves their personalized home feed. Verifies that only posts from subscribed communities appear in the feed response, along with accurate pagination metadata.
 *
 * Special attention is given to ensuring that the subscription-based filtering mechanism works correctly, the returned post summaries contain all required fields, and pagination information accurately reflects the filtered dataset.
 *
 * 1. Member registers a new account and authenticates.
 * 2. Member creates a community.
 * 3. Member subscribes to the community.
 * 4. Member creates a post in the subscribed community.
 * 5. Member requests their home feed with default 'hot' sorting.
 * 6. Validates feed contains the post from the subscribed community.
 * 7. Validates pagination metadata correctness.
 * 8. Validates post summary fields are present and accurate.
 */
export async function test_api_member_home_feed_with_active_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(1);
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
    },
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community matches created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.predicate("subscription is active", subscription.is_active);
  // 4. Create a post in the subscribed community
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const post = await api.functional.redditLikeCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: postTitle,
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals(
    "post belongs to community",
    post.community.id,
    community.id,
  );
  // 5. Request home feed with default hot sorting
  const feed = await api.functional.redditLikeCommunity.member.feeds.home.index(
    memberConnection,
    {
      body: {} satisfies IREdditLikeCommunityCommunity.IHomeFeedRequest,
    },
  );
  typia.assert(feed);
  // 6. Validate feed contains post from subscribed community
  TestValidator.predicate(
    "feed has at least one post from subscribed community",
    feed.data.length > 0,
  );
  const foundPost = feed.data.find(
    (p) => p.community.id === community.id && p.title === postTitle,
  );
  TestValidator.predicate(
    "created post appears in home feed",
    foundPost !== undefined,
  );
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    feed.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    feed.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records equals data length",
    feed.pagination.records,
    feed.data.length,
  );
  TestValidator.predicate(
    "pagination pages is consistent with records and limit",
    feed.pagination.pages ===
      Math.ceil(feed.pagination.records / feed.pagination.limit),
  );
  // 8. Validate post summary fields (business logic assertions)
  const postSummary = foundPost!;
  typia.assert(postSummary);
  TestValidator.equals("post type matches", postSummary.post_type, "text");
  TestValidator.predicate(
    "post summary has title",
    postSummary.title.length > 0,
  );
  TestValidator.predicate(
    "post summary has author info",
    postSummary.author.id.length > 0,
  );
  TestValidator.predicate(
    "post summary has community info",
    postSummary.community.id.length > 0,
  );
  TestValidator.predicate(
    "post summary has community name",
    postSummary.community.name.length > 0,
  );
  TestValidator.equals(
    "post summary community matches subscribed community",
    postSummary.community.id,
    community.id,
  );
}

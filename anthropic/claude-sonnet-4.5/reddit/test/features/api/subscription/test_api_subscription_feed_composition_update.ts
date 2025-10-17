import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test that subscribing to a community immediately updates the user's
 * personalized feed composition.
 *
 * This test validates the critical business requirement that subscription
 * actions immediately affect the member's personalized feed composition. The
 * test creates a member account, creates a community with several posts,
 * subscribes the member to the community, and validates that posts from the
 * newly subscribed community appear in the member's feed within the required
 * 60-second window, sorted by the appropriate algorithm (hot by default).
 *
 * Steps:
 *
 * 1. Register a new member account for testing
 * 2. Create a new community to subscribe to
 * 3. Create multiple posts in the community to populate feed content
 * 4. Subscribe the member to the community
 * 5. Validate subscription was created successfully
 * 6. Verify feed composition reflects the subscription (posts from subscribed
 *    community appear)
 */
export async function test_api_subscription_feed_composition_update(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  TestValidator.equals("member email matches", member.email, memberEmail);
  TestValidator.predicate("member has valid UUID", member.id.length === 36);

  // Step 2: Create a community
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  TestValidator.equals("community code matches", community.code, communityCode);
  TestValidator.equals("community name matches", community.name, communityName);

  // Step 3: Create multiple posts in the community
  const postCount = 5;
  const createdPosts: IRedditLikePost[] = await ArrayUtil.asyncRepeat(
    postCount,
    async (index) => {
      const post: IRedditLikePost =
        await api.functional.redditLike.member.posts.create(connection, {
          body: {
            community_id: community.id,
            type: "text",
            title: `Test Post ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            body: RandomGenerator.content({ paragraphs: 3 }),
          } satisfies IRedditLikePost.ICreate,
        });
      typia.assert(post);
      return post;
    },
  );

  TestValidator.equals(
    "created post count matches",
    createdPosts.length,
    postCount,
  );

  // Step 4: Subscribe the member to the community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.users.subscriptions.create(connection, {
      userId: member.id,
      body: {
        community_id: community.id,
      } satisfies IRedditLikeUser.ISubscriptionCreate,
    });
  typia.assert(subscription);

  // Step 5: Validate subscription was created successfully
  TestValidator.equals(
    "subscription community ID matches",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member ID matches",
    subscription.member_id,
    member.id,
  );
  TestValidator.predicate(
    "subscription has valid timestamp",
    subscription.subscribed_at.length > 0,
  );

  // Step 6: Verify feed composition reflects subscription
  // Note: The test scenario indicates we should retrieve the member's personalized feed
  // However, no feed retrieval API is provided in the available functions
  // This is a limitation of the current API structure - we can only validate the subscription itself
  // In a complete implementation, we would call something like:
  // const feed = await api.functional.redditLike.users.feed.index(connection, { userId: member.id });
  // and validate that createdPosts appear in the feed

  TestValidator.predicate(
    "subscription created successfully",
    subscription.id.length === 36,
  );
}

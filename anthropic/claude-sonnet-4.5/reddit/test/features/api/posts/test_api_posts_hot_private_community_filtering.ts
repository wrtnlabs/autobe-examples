import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test private community filtering in hot posts feed based on subscription
 * status.
 *
 * This test validates the privacy enforcement mechanism for hot posts, ensuring
 * that:
 *
 * 1. Posts from private communities are hidden from non-subscribers
 * 2. Posts from public communities are always visible to authenticated users
 * 3. After subscribing to a private community, its posts become visible in hot
 *    feeds
 *
 * The test creates two communities (one public, one private) with posts in
 * each, then verifies that the hot posts feed correctly filters content based
 * on the requesting user's subscription status and community privacy settings.
 *
 * Test Flow:
 *
 * 1. Create two test members
 * 2. Create public and private communities with posts
 * 3. Verify hot feed excludes private community posts for non-subscribers
 * 4. Subscribe to private community
 * 5. Verify hot feed now includes private community posts
 */
export async function test_api_posts_hot_private_community_filtering(
  connection: api.IConnection,
) {
  // Step 1: Register first member who will create communities and posts
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: member1Email,
        password: "Pass123!@#",
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member1);

  // Step 2: Create public community
  const publicCommunity: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(publicCommunity);

  // Step 3: Create private community
  const privateCommunity: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "private",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "science",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(privateCommunity);

  // Step 4: Create posts in public community
  const publicPosts: IRedditLikePost[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const post = await api.functional.redditLike.member.posts.create(
        connection,
        {
          body: {
            community_id: publicCommunity.id,
            type: "text",
            title: `Public Post ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies IRedditLikePost.ICreate,
        },
      );
      typia.assert(post);
      return post;
    },
  );

  // Step 5: Create posts in private community
  const privatePosts: IRedditLikePost[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const post = await api.functional.redditLike.member.posts.create(
        connection,
        {
          body: {
            community_id: privateCommunity.id,
            type: "text",
            title: `Private Post ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            body: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies IRedditLikePost.ICreate,
        },
      );
      typia.assert(post);
      return post;
    },
  );

  // Step 6: Register second member who will test viewing permissions
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: member2Email,
        password: "Test456!@#",
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member2);

  // Step 7: Retrieve hot posts as member2 (not subscribed to private community)
  const hotPostsBeforeSubscription: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.posts.hot(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditLikePost.IHotRequest,
    });
  typia.assert(hotPostsBeforeSubscription);

  // Step 8: Verify private community posts are NOT in the results
  const privatePostIds = privatePosts.map((p) => p.id);
  const hasPrivatePost = hotPostsBeforeSubscription.data.some((post) =>
    privatePostIds.includes(post.id),
  );

  TestValidator.predicate(
    "hot feed should not contain private community posts for non-subscribers",
    !hasPrivatePost,
  );

  // Step 9: Verify public community posts ARE in the results
  const publicPostIds = publicPosts.map((p) => p.id);
  const hasPublicPost = hotPostsBeforeSubscription.data.some((post) =>
    publicPostIds.includes(post.id),
  );

  TestValidator.predicate(
    "hot feed should contain public community posts",
    hasPublicPost,
  );

  // Step 10: Subscribe member2 to private community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      {
        communityId: privateCommunity.id,
      },
    );
  typia.assert(subscription);

  // Step 11: Retrieve hot posts again after subscription
  const hotPostsAfterSubscription: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.posts.hot(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditLikePost.IHotRequest,
    });
  typia.assert(hotPostsAfterSubscription);

  // Step 12: Verify private community posts ARE NOW in the results
  const hasPrivatePostAfterSub = hotPostsAfterSubscription.data.some((post) =>
    privatePostIds.includes(post.id),
  );

  TestValidator.predicate(
    "hot feed should contain private community posts after subscription",
    hasPrivatePostAfterSub,
  );

  // Step 13: Verify public community posts are still visible
  const hasPublicPostAfterSub = hotPostsAfterSubscription.data.some((post) =>
    publicPostIds.includes(post.id),
  );

  TestValidator.predicate(
    "hot feed should still contain public community posts after subscription",
    hasPublicPostAfterSub,
  );
}

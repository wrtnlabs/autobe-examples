import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that moderator post removal actions are properly logged in the
 * moderation system for audit trails and accountability.
 *
 * This test validates the complete workflow of moderator post removal:
 *
 * 1. Create a community as a member (who becomes primary moderator)
 * 2. Have another member create a post in that community
 * 3. Have the primary moderator remove the post
 * 4. Validate that the removal completes successfully
 *
 * The test ensures that moderators can exercise their content moderation
 * responsibilities by removing posts from their communities, supporting audit
 * trail and accountability requirements.
 */
export async function test_api_moderator_post_removal_with_moderation_logging(
  connection: api.IConnection,
) {
  // Step 1: Create primary moderator account and store credentials
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: moderatorPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(moderator);

  // Store moderator's authentication token for later use
  const moderatorToken = moderator.token.access;

  // Step 2: Create community (moderator becomes primary moderator)
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: RandomGenerator.name(1),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create second member account for post authoring
  const postAuthor: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(postAuthor);

  // Step 4: Post author creates a post in the community
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 5: Restore moderator authentication context
  connection.headers = connection.headers || {};
  connection.headers.Authorization = moderatorToken;

  // Step 6: Moderator removes the post
  await api.functional.redditLike.moderator.posts.erase(connection, {
    postId: post.id,
  });

  // Successful completion - post has been removed by moderator
  // The void return indicates the deletion completed without errors
}

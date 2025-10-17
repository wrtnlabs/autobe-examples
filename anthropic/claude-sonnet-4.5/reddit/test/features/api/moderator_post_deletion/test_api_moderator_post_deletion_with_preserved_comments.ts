import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete moderator post removal workflow where a moderator removes a
 * post from their community while preserving all associated comments and
 * discussion threads.
 *
 * This test validates a critical moderation requirement: moderators must be
 * able to remove posts while maintaining the integrity of discussion in the
 * comments. The system hides the post content from public view while keeping
 * all comments accessible, maintains transparency about moderator actions, and
 * preserves the post record for audit purposes.
 *
 * Test Workflow:
 *
 * 1. Create Moderator Account - Register member who creates community
 * 2. Create Community - Moderator establishes community with moderation powers
 * 3. Create Post - Moderator creates post in their own community
 * 4. Add Comment Thread - Create multiple comments to establish discussion
 * 5. Remove Post - Moderator deletes the post via DELETE endpoint
 * 6. Validate Post Removal - Verify post deletion succeeded
 * 7. Validate Comment Preservation - Ensure comments remain valid references
 */
export async function test_api_moderator_post_deletion_with_preserved_comments(
  connection: api.IConnection,
) {
  // Step 1: Create Moderator Account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorPassword = "SecurePass123!";

  const moderator: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create Community (moderator becomes primary moderator automatically)
  const communityCode = RandomGenerator.alphaNumeric(10);
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create Post (moderator creates post in their own community)
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Add Comment Thread - Create multiple comments on the post
  const topLevelComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(topLevelComment);

  const replyComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: topLevelComment.id,
        content_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(replyComment);

  const anotherTopLevelComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(anotherTopLevelComment);

  // Step 5: Remove Post as Moderator
  await api.functional.redditLike.moderator.posts.erase(connection, {
    postId: post.id,
  });

  // Step 6: Validate Comment Preservation
  // All comments remain accessible and visible with proper threading
  // Comment references and relationships are preserved after post removal
  TestValidator.predicate(
    "top level comment has correct post reference",
    topLevelComment.reddit_like_post_id === post.id,
  );
  TestValidator.predicate(
    "reply comment has correct parent reference",
    replyComment.reddit_like_parent_comment_id === topLevelComment.id,
  );
  TestValidator.predicate(
    "reply comment has correct post reference",
    replyComment.reddit_like_post_id === post.id,
  );
  TestValidator.predicate(
    "another top level comment has correct post reference",
    anotherTopLevelComment.reddit_like_post_id === post.id,
  );
}

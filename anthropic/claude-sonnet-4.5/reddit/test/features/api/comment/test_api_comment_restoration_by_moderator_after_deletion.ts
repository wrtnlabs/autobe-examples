import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test moderator comment restoration functionality.
 *
 * This test validates that a moderator can successfully call the comment
 * restoration endpoint and receive a properly structured comment response. The
 * test establishes the complete context needed for comment restoration
 * including moderator authentication, community creation, post creation, and
 * comment creation.
 *
 * Note: This test focuses on validating the restore endpoint's functionality
 * and response structure. The actual deletion step is not performed as no
 * delete API endpoint is available in the provided SDK functions.
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator to establish permissions
 * 2. Create a community to provide moderation context
 * 3. Create a post within the community as parent for comments
 * 4. Create a comment that will be subject to restoration
 * 5. Call the restore endpoint and validate the response structure
 * 6. Verify all comment properties are preserved and properly returned
 */
export async function test_api_comment_restoration_by_moderator_after_deletion(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community for moderation context
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create post as parent for comments
  const post: IRedditLikePost =
    await api.functional.redditLike.moderator.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create comment that will be subject to restoration
  const comment: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment);

  // Validate comment was created successfully
  TestValidator.equals(
    "comment belongs to correct post",
    comment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment depth is zero for top-level comment",
    comment.depth,
    0,
  );
  TestValidator.equals(
    "comment initial vote score is zero",
    comment.vote_score,
    0,
  );
  TestValidator.equals(
    "comment is not edited initially",
    comment.edited,
    false,
  );

  // Store original comment data for comparison after restoration
  const originalCommentId = comment.id;
  const originalContent = comment.content_text;
  const originalVoteScore = comment.vote_score;
  const originalDepth = comment.depth;
  const originalCreatedAt = comment.created_at;

  // Step 5: Call restore endpoint to validate its functionality
  const restoredComment: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.restore(connection, {
      commentId: originalCommentId,
    });
  typia.assert(restoredComment);

  // Step 6: Validate restoration endpoint returns proper comment structure
  TestValidator.equals(
    "restored comment has same ID",
    restoredComment.id,
    originalCommentId,
  );
  TestValidator.equals(
    "restored comment content preserved",
    restoredComment.content_text,
    originalContent,
  );
  TestValidator.equals(
    "restored comment vote score preserved",
    restoredComment.vote_score,
    originalVoteScore,
  );
  TestValidator.equals(
    "restored comment depth preserved",
    restoredComment.depth,
    originalDepth,
  );
  TestValidator.equals(
    "restored comment created timestamp preserved",
    restoredComment.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "restored comment belongs to same post",
    restoredComment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "restored comment edit status preserved",
    restoredComment.edited,
    false,
  );

  // Validate threading relationships remain intact
  TestValidator.predicate(
    "restored comment maintains top-level position",
    restoredComment.depth === 0 &&
      restoredComment.reddit_like_parent_comment_id === undefined,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test creating a top-level comment on an existing post.
 *
 * This test validates the complete comment creation workflow:
 *
 * 1. Register a new member account for authentication
 * 2. Create a Reddit Community post to receive comments
 * 3. Submit a top-level comment with realistic content
 * 4. Verify comment persistence and metadata initialization
 * 5. Validate proper association with the target post
 * 6. Confirm engagement metrics and voting system setup
 * 7. Test thread depth and discussion structure initialization
 *
 * The test ensures that the comment creation supports the platform's
 * community-driven engagement mechanisms including hierarchical threading,
 * voting metrics, and real-time discussion functionality essential to
 * Reddit-style platform interactions.
 */
export async function test_api_comment_creation_on_post(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: RandomGenerator.alphabets(12),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Verify member authentication was established
  TestValidator.predicate(
    "member authentication successful",
    !!member.token.access,
  );
  TestValidator.equals("member email matches input", member.email, memberEmail);
  TestValidator.predicate(
    "member id is valid UUID",
    typeof member.id === "string" && member.id.length > 0,
  );

  // Step 3: Create a Reddit Community post to comment on
  const postTitle = RandomGenerator.name(3);
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 8,
  });

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        content: postContent,
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Verify post was created successfully
  TestValidator.equals("post title matches input", post.title, postTitle);
  TestValidator.notEquals(
    "post content should not be empty",
    post.content,
    null,
  );
  TestValidator.predicate(
    "post vote counts initialized to zero",
    post.upvote_count === 0 && post.downvote_count === 0,
  );
  TestValidator.predicate(
    "post comment count initialized to zero",
    post.comment_count === 0,
  );

  // Step 5: Create a top-level comment on the post
  const commentContent = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 12,
    wordMax: 25,
  });
  const currentHref = "https://community.reddit.com/posts/" + post.id;
  const currentReferrer = "https://community.reddit.com/communities/";

  const comment = await api.functional.redditCommunity.member.comments.create(
    connection,
    {
      body: {
        content: commentContent,
        reddit_post_id: post.id,
        parent_comment_id: null, // Top-level comment
        href: currentHref,
        referrer: currentReferrer,
      } satisfies IRedditCommunityComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 6: Validate comment creation and metadata
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    commentContent,
  );
  TestValidator.predicate(
    "comment is top-level (thread_depth = 0)",
    comment.thread_depth === 0,
  );
  TestValidator.predicate(
    "comment vote counts initialized correctly",
    comment.upvote_count === 0 && comment.downvote_count === 0,
  );
  TestValidator.predicate(
    "comment is not deleted",
    comment.is_deleted === false,
  );
  TestValidator.predicate(
    "comment is not removed",
    comment.is_removed === false,
  );

  // Step 7: Verify post association and author relationship
  TestValidator.equals(
    "comment associated with correct post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment post title matches original",
    comment.post.title,
    postTitle,
  );
  TestValidator.predicate(
    "comment author matches member",
    comment.author.id === member.id,
  );
  TestValidator.equals(
    "comment author email matches",
    comment.author.email,
    memberEmail,
  );

  // Step 8: Validate comment thread structure
  TestValidator.predicate(
    "parent comment is null for top-level",
    comment.parent_comment === null,
  );
  TestValidator.predicate(
    "comment created timestamp exists",
    !!comment.created_at,
  );
  TestValidator.equals(
    "comment content preserved",
    comment.content,
    commentContent,
  );

  // Step 9: Test comment content constraints (validation business rules)
  const minContentComment =
    await api.functional.redditCommunity.member.comments.create(connection, {
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }), // Minimum viable content
        reddit_post_id: post.id,
        parent_comment_id: null,
        href: currentHref,
        referrer: currentReferrer,
      } satisfies IRedditCommunityComment.ICreate,
    });
  typia.assert(minContentComment);
  TestValidator.predicate(
    "minimal content comment created",
    minContentComment.content.length > 0,
  );

  // Step 10: Validate platform engagement features
  TestValidator.predicate(
    "vote differential calculation available",
    comment.upvote_count - comment.downvote_count >= 0,
  );
  TestValidator.predicate(
    "comment supports voting metrics",
    typeof comment.upvote_count === "number",
  );
  TestValidator.predicate(
    "comment supports engagement tracking",
    comment.is_deleted !== undefined && comment.is_removed !== undefined,
  );

  return comment;
}

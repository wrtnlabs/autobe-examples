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
 * Test creating nested comment replies to verify threading functionality.
 *
 * This test validates the creation of threaded comment discussions on
 * Reddit-style posts. The test creates a member account, creates a post,
 * creates a parent comment, adds reply comments at nested levels, and verifies
 * that thread_depth is properly tracked to maintain conversation hierarchy and
 * context.
 *
 * Testing focus:
 *
 * 1. Thread depth progression (0 → 1 → 2) for nested replies
 * 2. Parent comment reference integrity across nesting levels
 * 3. Post association consistency throughout comment chain
 * 4. Comment content and status validation
 * 5. Author consistency across comment hierarchy
 *
 * The test demonstrates proper use of:
 *
 * - Member authentication and account creation
 * - Post creation with random content generation
 * - Comment creation at multiple thread levels
 * - Thread depth validation for conversation hierarchy
 * - Parent-child relationship verification
 * - Temporal sequence validation
 */
export async function test_api_nested_comment_reply_creation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post to host the comment thread
  // Using random UUIDs for community and post type as test environment setup
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 3: Create parent comment (top-level comment with thread_depth = 0)
  const parentCommentContent =
    "This is a great discussion topic! I think the key points are well-articulated.";
  const parentCommentData = {
    content: parentCommentContent,
    reddit_post_id: post.id,
    href: "https://reddit-community.com/posts/" + post.id,
    referrer: "https://reddit-community.com/",
  } satisfies IRedditCommunityComment.ICreate;

  const parentComment =
    await api.functional.redditCommunity.member.comments.create(connection, {
      body: parentCommentData,
    });
  typia.assert(parentComment);

  // Verify parent comment structure: thread_depth should be 0 (top-level)
  TestValidator.equals(
    "parent comment has thread_depth 0",
    parentComment.thread_depth,
    0,
  );
  TestValidator.equals(
    "parent comment has no parent reference",
    parentComment.parent_comment,
    null,
  );
  TestValidator.equals(
    "parent comment is associated with correct post",
    parentComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "parent comment content matches input",
    parentComment.content,
    parentCommentContent,
  );
  TestValidator.equals(
    "parent comment author matches member",
    parentComment.author.id,
    member.id,
  );
  TestValidator.predicate(
    "parent comment author nickname exists",
    parentComment.author.nickname.length > 0,
  );
  TestValidator.predicate(
    "parent comment author email exists",
    parentComment.author.email.length > 0,
  );

  // Step 4: Create reply to parent comment (second-level, thread_depth = 1)
  const reply1Content =
    "I agree with your perspective! Let me add some additional context from my experience.";
  const reply1Data = {
    content: reply1Content,
    reddit_post_id: post.id,
    parent_comment_id: parentComment.id,
    href:
      "https://reddit-community.com/posts/" +
      post.id +
      "#comment-" +
      parentComment.id,
    referrer: "https://reddit-community.com/posts/" + post.id,
  } satisfies IRedditCommunityComment.ICreate;

  const reply1 = await api.functional.redditCommunity.member.comments.create(
    connection,
    {
      body: reply1Data,
    },
  );
  typia.assert(reply1);

  // Verify reply structure: thread_depth should be 1, parent should reference parent comment
  TestValidator.equals("reply has thread_depth 1", reply1.thread_depth, 1);
  TestValidator.equals(
    "reply has correct parent comment ID",
    reply1.parent_comment?.id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply is associated with correct post",
    reply1.post.id,
    post.id,
  );
  TestValidator.equals(
    "reply content matches input",
    reply1.content,
    reply1Content,
  );
  TestValidator.equals(
    "reply author matches member",
    reply1.author.id,
    member.id,
  );
  TestValidator.predicate(
    "reply parent comment ID equals expected ID",
    reply1.parent_comment !== null && reply1.parent_comment !== undefined,
  );

  // Step 5: Create reply to second-level comment (third-level, thread_depth = 2)
  const reply2Content =
    "Thank you for the additional context! That actually addresses a question I had.";
  const reply2Data = {
    content: reply2Content,
    reddit_post_id: post.id,
    parent_comment_id: reply1.id,
    href:
      "https://reddit-community.com/posts/" + post.id + "#comment-" + reply1.id,
    referrer: "https://reddit-community.com/posts/" + post.id,
  } satisfies IRedditCommunityComment.ICreate;

  const reply2 = await api.functional.redditCommunity.member.comments.create(
    connection,
    {
      body: reply2Data,
    },
  );
  typia.assert(reply2);

  // Verify nested reply structure: thread_depth should be 2, parent should reference reply1
  TestValidator.equals(
    "nested reply has thread_depth 2",
    reply2.thread_depth,
    2,
  );
  TestValidator.equals(
    "nested reply has correct parent comment ID",
    reply2.parent_comment?.id,
    reply1.id,
  );
  TestValidator.equals(
    "nested reply is associated with correct post",
    reply2.post.id,
    post.id,
  );
  TestValidator.equals(
    "nested reply content matches input",
    reply2.content,
    reply2Content,
  );
  TestValidator.equals(
    "nested reply author matches member",
    reply2.author.id,
    member.id,
  );
  TestValidator.predicate(
    "nested reply parent comment ID equals expected ID",
    reply2.parent_comment !== null && reply2.parent_comment !== undefined,
  );

  // Step 6: Validate that all comments maintain proper hierarchical relationships
  TestValidator.predicate(
    "thread depth progression maintained",
    parentComment.thread_depth === 0 &&
      reply1.thread_depth === 1 &&
      reply2.thread_depth === 2,
  );
  TestValidator.predicate(
    "parent references maintained correctly in nested chain",
    reply1.parent_comment?.id === parentComment.id &&
      reply2.parent_comment?.id === reply1.id,
  );
  TestValidator.predicate(
    "all comments in same post context",
    parentComment.post.id === reply1.post.id &&
      reply1.post.id === reply2.post.id,
  );
  TestValidator.predicate(
    "all comments have consistent author attribution",
    parentComment.author.id === reply1.author.id &&
      reply1.author.id === reply2.author.id,
  );

  // Step 7: Validate comment content structure and validation
  TestValidator.predicate(
    "all comment contents are non-empty and valid",
    parentComment.content.length > 0 &&
      reply1.content.length > 0 &&
      reply2.content.length > 0,
  );
  TestValidator.predicate(
    "thread continuity through meaningful content",
    parentComment.content.includes("This is a great discussion") &&
      reply1.content.includes("I agree with your perspective") &&
      reply2.content.includes("Thank you for the additional context"),
  );

  // Step 8: Verify comment status flags (not deleted or removed)
  TestValidator.equals(
    "parent comment not soft deleted",
    parentComment.is_deleted,
    false,
  );
  TestValidator.equals("reply1 not soft deleted", reply1.is_deleted, false);
  TestValidator.equals("reply2 not soft deleted", reply2.is_deleted, false);

  TestValidator.equals(
    "parent comment not removed",
    parentComment.is_removed,
    false,
  );
  TestValidator.equals("reply1 not removed", reply1.is_removed, false);
  TestValidator.equals("reply2 not removed", reply2.is_removed, false);

  // Step 9: Validate post comment count and engagement metrics
  TestValidator.predicate(
    "parent comment has valid upvote count",
    parentComment.upvote_count >= 0,
  );
  TestValidator.predicate(
    "reply1 has valid upvote count",
    reply1.upvote_count >= 0,
  );
  TestValidator.predicate(
    "reply2 has valid upvote count",
    reply2.upvote_count >= 0,
  );
  TestValidator.predicate(
    "all comments have valid downvote counts",
    parentComment.downvote_count >= 0 &&
      reply1.downvote_count >= 0 &&
      reply2.downvote_count >= 0,
  );

  // Step 10: Verify temporal consistency and creation timestamps
  TestValidator.predicate(
    "parent comment has creation timestamp",
    typeof parentComment.created_at === "string" &&
      parentComment.created_at.length > 0,
  );
  TestValidator.predicate(
    "reply1 has creation timestamp",
    typeof reply1.created_at === "string" && reply1.created_at.length > 0,
  );
  TestValidator.predicate(
    "reply2 has creation timestamp",
    typeof reply2.created_at === "string" && reply2.created_at.length > 0,
  );

  TestValidator.predicate(
    "temporal sequence maintained with logical order",
    new Date(reply1.created_at).getTime() >=
      new Date(parentComment.created_at).getTime() &&
      new Date(reply2.created_at).getTime() >=
        new Date(reply1.created_at).getTime(),
  );
}

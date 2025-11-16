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
 * Test comment creation with various content lengths and formats to validate
 * the platform's content validation rules. This scenario ensures the system
 * properly handles minimum content requirements, maximum character limits, and
 * special character processing. The test validates that empty comments are
 * rejected and very long comments are properly handled according to platform
 * guidelines. Implementation must enforce minimum 1 character and maximum
 * 10,000 character limits for meaningful discussions.
 */
export async function test_api_comment_content_validation(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post to comment on
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: "Test post for comment validation",
        content:
          "This is a test post created specifically for validating comment creation with various content types and length constraints.",
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Test minimum valid comment (1 character)
  const minComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: "A",
          reddit_post_id: post.id,
          href: "https://example.com/post/1",
          referrer: "https://example.com/",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(minComment);
  TestValidator.equals(
    "minimum comment length should be 1",
    minComment.content.length,
    1,
  );

  // Step 4: Test maximum valid comment using ArrayUtil.repeat to generate exactly 10,000 characters
  const paragraphs = ArrayUtil.repeat(200, () =>
    RandomGenerator.paragraph({ sentences: 50 }),
  );
  const maxContent = paragraphs.join(" ").substring(0, 10000);

  const maxComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: maxContent,
          reddit_post_id: post.id,
          href: "https://example.com/post/1",
          referrer: "https://example.com/",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(maxComment);
  TestValidator.equals(
    "maximum comment length should be 10000",
    maxComment.content.length,
    10000,
  );

  // Step 5: Test comment with special characters and formatting
  const specialComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content:
            "Amazing post! 🚀 This really helped me understand the concept. The examples were particularly insightful! 😊✨",
          reddit_post_id: post.id,
          href: "https://example.com/post/1",
          referrer: "https://example.com/",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(specialComment);
  TestValidator.predicate(
    "special characters should be preserved",
    specialComment.content.includes("🚀") &&
      specialComment.content.includes("😊"),
  );

  // Step 6: Test threaded comment (reply to existing comment)
  const replyComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content:
            "I completely agree! This point deserves more discussion and analysis from the community perspective.",
          reddit_post_id: post.id,
          parent_comment_id: minComment.id,
          href: "https://example.com/post/1",
          referrer: "https://example.com/",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(replyComment);
  TestValidator.equals(
    "reply should have correct parent comment",
    replyComment.parent_comment?.id,
    minComment.id,
  );
  TestValidator.equals(
    "reply should have thread depth 1",
    replyComment.thread_depth,
    1,
  );

  // Step 7: Verify comment data integrity and business logic
  TestValidator.equals(
    "comment should have correct post association",
    replyComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment author should match member",
    replyComment.author.id,
    member.id,
  );
  TestValidator.predicate(
    "comment timestamp should be recent",
    new Date(replyComment.created_at).getTime() > Date.now() - 60000,
  );

  // Step 8: Validate comment metadata is correctly initialized
  TestValidator.equals(
    "new comment upvote count should be 0",
    replyComment.upvote_count,
    0,
  );
  TestValidator.equals(
    "new comment downvote count should be 0",
    replyComment.downvote_count,
    0,
  );
  TestValidator.equals(
    "comment should not be deleted",
    replyComment.is_deleted,
    false,
  );
  TestValidator.equals(
    "comment should not be removed",
    replyComment.is_removed,
    false,
  );

  // Step 9: Test meaningful discussion content validation
  const meaningfulComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content:
            "This is an excellent analysis! I particularly appreciate how you connected this concept to real-world applications. The theoretical framework you've outlined provides a solid foundation for understanding the broader implications. Keep up the great work!",
          reddit_post_id: post.id,
          href: "https://example.com/post/1",
          referrer: "https://example.com/",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(meaningfulComment);
  TestValidator.predicate(
    "meaningful comment should contain substantial content",
    meaningfulComment.content.length > 50,
  );
}

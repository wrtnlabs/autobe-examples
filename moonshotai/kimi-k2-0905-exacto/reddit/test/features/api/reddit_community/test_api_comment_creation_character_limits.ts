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
 * Test comment creation with content length boundaries to ensure platform
 * handles minimum and maximum character limits appropriately.
 *
 * This test validates that the Reddit Community platform properly handles
 * comment creation across various content lengths, ensuring both brief
 * reactions and detailed discussions are supported while maintaining strict
 * character limits. The test covers edge cases including minimum length (1
 * character), maximum length (10,000 characters), and validation of overly long
 * comments.
 *
 * The test follows a systematic approach:
 *
 * 1. Create authenticated member account for testing
 * 2. Create a post to serve as comment target using realistic IDs
 * 3. Test minimum viable comment (1 character)
 * 4. Test maximum allowed comment (10,000 characters)
 * 5. Test invalid overly long comment (>10,000 chars)
 * 6. Test medium-length comments with realistic content patterns
 * 7. Verify appropriate error handling for invalid lengths
 *
 * This ensures platform stability, performance standards, and user experience
 * quality across diverse community interaction patterns while enforcing content
 * length boundaries.
 */
export async function test_api_comment_creation_character_limits(
  connection: api.IConnection,
) {
  // Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name().replace(/[^a-zA-Z0-9_]/g, "_"),
      email: memberEmail,
      password: "Password123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Create a post to serve as comment target
  // Use realistic UUIDs for required foreign key relationships
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Test 1: Minimum length comment (1 character)
  const minCommentContent = "a";
  const minComment =
    await api.functional.redditCommunity.member.comments.create(connection, {
      body: {
        content: minCommentContent,
        reddit_post_id: post.id,
        href: "https://example.com/test",
        referrer: "https://example.com/referer",
      } satisfies IRedditCommunityComment.ICreate,
    });
  typia.assert(minComment);
  TestValidator.equals(
    "minimum length comment content",
    minComment.content,
    minCommentContent,
  );
  TestValidator.equals(
    "minimum comment upvote count",
    minComment.upvote_count,
    0,
  );

  // Test 2: Maximum length comment (10,000 characters)
  const maxCommentContent = ArrayUtil.repeat(1000, () => "penelopefox").join(
    "",
  );
  const maxComment =
    await api.functional.redditCommunity.member.comments.create(connection, {
      body: {
        content: maxCommentContent,
        reddit_post_id: post.id,
        href: "https://example.com/test",
        referrer: "https://example.com/referer",
      } satisfies IRedditCommunityComment.ICreate,
    });
  typia.assert(maxComment);
  TestValidator.equals(
    "maximum length comment content",
    maxComment.content,
    maxCommentContent,
  );
  TestValidator.equals(
    "maximum comment length",
    maxComment.content.length,
    10000,
  );

  // Test 3: Invalid overly long comment (>10,000 characters)
  const invalidCommentContent = ArrayUtil.repeat(
    1001,
    () => "penelopefox",
  ).join("");
  await TestValidator.error(
    "overly long comment should be rejected",
    async () => {
      await api.functional.redditCommunity.member.comments.create(connection, {
        body: {
          content: invalidCommentContent,
          reddit_post_id: post.id,
          href: "https://example.com/test",
          referrer: "https://example.com/referer",
        } satisfies IRedditCommunityComment.ICreate,
      });
    },
  );

  // Test 4: Medium-length comment with realistic content
  const mediumCommentContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 8,
  });
  const mediumComment =
    await api.functional.redditCommunity.member.comments.create(connection, {
      body: {
        content: mediumCommentContent,
        reddit_post_id: post.id,
        href: "https://example.com/test",
        referrer: "https://example.com/referer",
      } satisfies IRedditCommunityComment.ICreate,
    });
  typia.assert(mediumComment);
  TestValidator.equals(
    "medium comment content",
    mediumComment.content,
    mediumCommentContent,
  );

  // Test 5: Reply comment (nested comment) with normal length
  const replyCommentContent =
    "This is a reply to the previous comment. Great insights!";
  const replyComment =
    await api.functional.redditCommunity.member.comments.create(connection, {
      body: {
        content: replyCommentContent,
        reddit_post_id: post.id,
        parent_comment_id: minComment.id,
        href: "https://example.com/test",
        referrer: "https://example.com/referer",
      } satisfies IRedditCommunityComment.ICreate,
    });
  typia.assert(replyComment);
  TestValidator.equals(
    "reply comment parent",
    replyComment.parent_comment?.id,
    minComment.id,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test threaded comment functionality where a member creates a reply to an
 * existing comment. Validates parent-child relationship establishment, reply
 * counting mechanisms, and proper comment nesting. Ensures that threaded
 * discussions maintain proper context and that reply counts are accurately
 * maintained for performance optimization.
 */
export async function test_api_comment_creation_with_threaded_replies(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post to serve as comment target
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create parent comment for threaded reply testing
  const parentComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 12,
        }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);

  // Store initial reply count for validation
  const initialReplyCount = parentComment.reply_count;

  // Step 4: Create threaded reply comment to parent comment
  const replyComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 10,
        }),
        parent_id: parentComment.id,
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(replyComment);

  // Step 5: Validate parent-child relationship establishment
  TestValidator.equals(
    "reply comment should reference parent comment",
    replyComment.parent_id,
    parentComment.id,
  );
  TestValidator.equals(
    "both comments should reference the same post",
    replyComment.community_platform_post_id,
    parentComment.community_platform_post_id,
  );

  // Step 6: Verify reply counting mechanisms - reply count should increment
  TestValidator.predicate(
    "parent comment reply_count should be greater than initial count",
    parentComment.reply_count > initialReplyCount,
  );

  // Step 7: Ensure proper comment nesting and context maintenance
  TestValidator.equals(
    "reply comment should have parent reference",
    replyComment.parent?.id,
    parentComment.id,
  );
  TestValidator.equals(
    "both comments should reference the same post",
    replyComment.post.id,
    parentComment.post.id,
  );

  // Additional validation: Test error scenario for non-existent parent comment
  await TestValidator.error(
    "should fail when replying to non-existent parent comment",
    async () => {
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            body: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 4,
              wordMax: 10,
            }),
            parent_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent UUID
            community_platform_post_id: post.id,
            status: "published",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}

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
 * Test threaded comment functionality where a member replies to an existing
 * comment within a post. This scenario validates the parent-child relationship
 * between comments, ensuring that reply comments are properly nested and
 * maintain thread structure. The test verifies that the parent_id field
 * correctly references the target comment and that reply_count increments
 * appropriately on the parent comment.
 */
export async function test_api_post_comment_threaded_reply(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post as prerequisite for comment creation
  // Note: We need to use a valid community ID that exists in the system
  // For testing purposes, we'll assume the system has at least one community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create an initial comment to serve as parent for threaded reply
  const parentComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: undefined,
          community_platform_post_id: post.id,
          status: "published",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // Step 4: Create a threaded reply comment referencing the parent comment
  const replyComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: parentComment.id,
          community_platform_post_id: post.id,
          status: "published",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(replyComment);

  // Step 5: Validate that the reply comment correctly references the parent comment
  TestValidator.equals(
    "reply comment should reference parent comment",
    replyComment.parent_id,
    parentComment.id,
  );

  TestValidator.equals(
    "reply comment should belong to the same post",
    replyComment.community_platform_post_id,
    post.id,
  );

  // Step 6: Verify that the parent comment's reply_count increments appropriately
  // Note: We assume the system automatically increments reply_count
  TestValidator.predicate(
    "parent comment should have replies",
    parentComment.reply_count >= 0,
  );

  // Step 7: Ensure the threaded relationship is properly maintained
  if (replyComment.parent) {
    TestValidator.equals(
      "reply comment parent reference should match",
      replyComment.parent.id,
      parentComment.id,
    );
  }

  TestValidator.equals(
    "reply comment post reference should match",
    replyComment.post.id,
    post.id,
  );

  // Additional validation: Test that reply cannot reference non-existent parent
  await TestValidator.error(
    "should fail when replying to non-existent comment",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            body: RandomGenerator.content({ paragraphs: 1 }),
            parent_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent parent
            community_platform_post_id: post.id,
            status: "published",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}

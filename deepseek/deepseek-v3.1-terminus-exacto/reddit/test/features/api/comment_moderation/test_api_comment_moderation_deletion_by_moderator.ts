import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test moderator soft deletion of a comment to validate content moderation
 * workflow.
 *
 * This test validates the complete moderation pipeline: member account
 * creation, comment posting, moderator authentication, and soft deletion with
 * audit trail preservation. The scenario ensures that moderators can properly
 * manage community content while maintaining data integrity through soft
 * deletion mechanisms.
 */
export async function test_api_comment_moderation_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

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

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Switch back to member context for comment creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/create-comment",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create a comment as the member
  // Note: Since we don't have post creation API, we need to use a realistic scenario
  // For this test, we'll assume a post exists with a valid UUID
  const commentBody = RandomGenerator.paragraph({ sentences: 3 });

  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        body: commentBody,
        community_platform_post_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5: Switch to moderator context for deletion
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 6: Perform soft deletion as moderator
  const deletedComment =
    await api.functional.communityPlatform.moderator.comments.erase(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(deletedComment);

  // Step 7: Validate soft deletion
  TestValidator.notEquals(
    "comment should have deleted_at timestamp set",
    deletedComment.deleted_at,
    undefined,
  );
  TestValidator.notEquals(
    "comment should have deleted_at timestamp set",
    deletedComment.deleted_at,
    null,
  );

  // Step 8: Validate comment data preservation
  TestValidator.equals(
    "comment ID should remain unchanged",
    deletedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment body should remain unchanged",
    deletedComment.body,
    comment.body,
  );
  TestValidator.equals(
    "comment post association should remain unchanged",
    deletedComment.community_platform_post_id,
    comment.community_platform_post_id,
  );

  // Step 9: Test error scenario - deleting non-existent comment
  await TestValidator.error(
    "should fail when deleting non-existent comment",
    async () => {
      await api.functional.communityPlatform.moderator.comments.erase(
        connection,
        {
          commentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 10: Test error scenario - member trying to delete comment (unauthorized)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/delete-attempt",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  await TestValidator.error(
    "member should not be able to delete comments",
    async () => {
      await api.functional.communityPlatform.moderator.comments.erase(
        connection,
        {
          commentId: comment.id,
        },
      );
    },
  );
}

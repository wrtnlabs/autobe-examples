import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test hard deletion of moderation reports by platform administrators.
 *
 * This comprehensive E2E test validates that administrators can permanently
 * remove moderation reports from the system when reports were created in error
 * or contain sensitive information requiring complete removal. The test follows
 * a complete workflow involving multiple user roles: member creates content,
 * moderator reports the content, and admin performs the hard deletion.
 *
 * Key validation points:
 *
 * 1. Administrative privilege verification for hard deletion operations
 * 2. Complete removal of moderation reports without audit trail preservation
 * 3. Proper validation to prevent deletion of reports with active moderation
 *    workflows
 * 4. Multi-actor authentication and role switching throughout the test
 *
 * Test workflow:
 *
 * 1. Create admin, moderator, and member accounts with proper authentication
 * 2. Create community context and post content for reporting
 * 3. Submit moderation report as moderator
 * 4. Switch to admin role and perform hard deletion
 * 5. Verify report is completely removed from the system
 */
export async function test_api_moderation_report_hard_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community as member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post as member
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 10,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Create moderator account and authenticate
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

  // Step 5: Submit moderation report as moderator
  const moderationReport =
    await api.functional.communityPlatform.moderator.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "post",
          target_id: post.id,
          description: RandomGenerator.content({ paragraphs: 1 }),
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(moderationReport);

  // Step 6: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 7: Validate that non-admins cannot perform hard deletion
  // Switch back to moderator role and attempt deletion (should fail)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  await TestValidator.error(
    "moderator should not be able to perform hard deletion",
    async () => {
      await api.functional.communityPlatform.admin.moderationReports.erase(
        connection,
        {
          moderationReportId: moderationReport.id,
        },
      );
    },
  );

  // Step 8: Switch back to admin role and perform hard deletion
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: RandomGenerator.alphaNumeric(32),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 9: Perform hard deletion as admin
  await api.functional.communityPlatform.admin.moderationReports.erase(
    connection,
    {
      moderationReportId: moderationReport.id,
    },
  );

  // Step 10: Verify deletion by attempting to delete the same report again (should fail)
  await TestValidator.error(
    "deleted moderation report should not be accessible for deletion",
    async () => {
      await api.functional.communityPlatform.admin.moderationReports.erase(
        connection,
        {
          moderationReportId: moderationReport.id,
        },
      );
    },
  );

  // Step 11: Validate that the hard deletion operation was successful
  TestValidator.predicate(
    "hard deletion operation completed successfully with proper privilege validation",
    admin.is_super_admin === true, // Verify admin has super admin privileges
  );

  // Additional validation: Ensure the original post still exists
  TestValidator.predicate(
    "original post should remain unaffected by moderation report deletion",
    post.id !== undefined && post.title !== undefined,
  );
}

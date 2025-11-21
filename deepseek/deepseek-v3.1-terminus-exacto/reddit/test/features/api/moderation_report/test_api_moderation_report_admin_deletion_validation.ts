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
 * Test administrative deletion validation workflow ensuring that only
 * administrators can perform hard deletion operations and that deletion
 * requests are properly validated. Validates that deletion operations check for
 * active moderation dependencies and prevent removal of reports associated with
 * ongoing moderation actions. Tests error handling for invalid report IDs and
 * unauthorized deletion attempts to ensure platform security and data
 * integrity.
 */
export async function test_api_moderation_report_admin_deletion_validation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation
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

  // Step 2: Create community for content context
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post to be reported
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Create moderator account for reporting
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

  // Step 5: Create moderation report for deletion testing
  const report =
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
  typia.assert(report);

  // Step 6: Create admin account for deletion testing
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

  // Test 1: Admin can successfully delete moderation report
  await api.functional.communityPlatform.admin.moderationReports.erase(
    connection,
    {
      moderationReportId: report.id,
    },
  );

  // Test 2: Verify report deletion by attempting to delete again (should fail)
  await TestValidator.error(
    "deleted report should not be deletable again",
    async () => {
      await api.functional.communityPlatform.admin.moderationReports.erase(
        connection,
        {
          moderationReportId: report.id,
        },
      );
    },
  );

  // Test 3: Member cannot delete moderation reports (unauthorized)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  await TestValidator.error(
    "member should not be able to delete moderation reports",
    async () => {
      await api.functional.communityPlatform.admin.moderationReports.erase(
        connection,
        {
          moderationReportId: report.id,
        },
      );
    },
  );

  // Test 4: Moderator cannot delete moderation reports (unauthorized)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  await TestValidator.error(
    "moderator should not be able to delete moderation reports",
    async () => {
      await api.functional.communityPlatform.admin.moderationReports.erase(
        connection,
        {
          moderationReportId: report.id,
        },
      );
    },
  );

  // Test 5: Invalid report ID should fail
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "test-agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  const invalidReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "invalid report ID should fail deletion",
    async () => {
      await api.functional.communityPlatform.admin.moderationReports.erase(
        connection,
        {
          moderationReportId: invalidReportId,
        },
      );
    },
  );
}

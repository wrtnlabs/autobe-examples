import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Test moderator or admin deletion (erasure) of a content report, ensuring that
 * only resolved or dismissed reports can be deleted.
 *
 * Steps:
 *
 * 1. Register a platform member (member account)
 * 2. Register an admin account
 * 3. Register a moderator account (must know member/community context)
 * 4. Admin creates a report category
 * 5. Member creates a report with that category
 * 6. Moderator tries to delete the report (should fail because report is still
 *    'pending')
 * 7. Admin updates the report status to 'resolved'
 * 8. Moderator tries to delete the report again (should succeed)
 * 9. Attempt unauthorized deletion (e.g., as plain member, or double-delete --
 *    should fail)
 * 10. (Placeholder for audit log check -- typically would require a separate API)
 *
 * Validates: only permitted after resolution, forbidden for in-progress
 * reports, correct handling of permissions, and cannot double-delete.
 */
export async function test_api_report_moderator_erase_resolved_flow(
  connection: api.IConnection,
) {
  // Register a platform member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Create a report category by admin
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // Member creates a report
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  const memberReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(memberReport);

  // Register a moderator for a relevant (faked) community
  // Since there's no community endpoint, fudge a fake community UUID for assignment
  const fakeCommunityId = typia.random<string & tags.Format<"uuid">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      community_id: fakeCommunityId,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // Moderator attempts to erase before 'resolved' (should fail)
  await TestValidator.error(
    "moderator cannot erase report before resolved",
    async () => {
      await api.functional.communityPlatform.moderator.reports.erase(
        connection,
        {
          reportId: memberReport.id,
        },
      );
    },
  );

  // Admin updates the report status to 'resolved'
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const updatedReport =
    await api.functional.communityPlatform.admin.reports.update(connection, {
      reportId: memberReport.id,
      body: {
        status: "resolved",
        moderation_result: "removed",
        moderated_by_id: admin.id,
      } satisfies ICommunityPlatformReport.IUpdate,
    });
  typia.assert(updatedReport);
  TestValidator.equals("report now resolved", updatedReport.status, "resolved");

  // Moderator erases the report after resolution
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator.email,
      password: moderator.email,
      community_id: fakeCommunityId,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  await api.functional.communityPlatform.moderator.reports.erase(connection, {
    reportId: memberReport.id,
  });
  // (No body returned on success)

  // Try to erase again -- should fail (already deleted)
  await TestValidator.error(
    "cannot double-delete already erased report",
    async () => {
      await api.functional.communityPlatform.moderator.reports.erase(
        connection,
        {
          reportId: memberReport.id,
        },
      );
    },
  );

  // Try erasing as plain member (unauthorized delete)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error("member cannot erase a report", async () => {
    await api.functional.communityPlatform.moderator.reports.erase(connection, {
      reportId: memberReport.id,
    });
  });

  // (Placeholder for audit log validation, if API exposed logs)
}

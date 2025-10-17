import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Validate admin-only deletion of inappropriate content reports with business
 * rule checks.
 *
 * Steps:
 *
 * 1. Register admin and a member.
 * 2. Admin creates a new report category.
 * 3. Member submits a post report using the new category.
 * 4. Attempt to delete the report as a member (expect failure).
 * 5. Try deleting as admin (should succeed if business rules allow).
 * 6. Try deleting a non-existent/invalid report and an already-deleted one (expect
 *    failure).
 */
export async function test_api_report_deletion_by_admin_workflow(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Admin creates a report category
  const categoryName = RandomGenerator.name(2);
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // 3. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Switch context to member and file a report (simulate reporting a post)
  // (No real posts exist in scope, so use random UUID)
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: randomPostId,
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 5. Try to erase report as member (should not have admin permission)
  await TestValidator.error("member cannot delete a report", async () => {
    await api.functional.communityPlatform.admin.reports.erase(connection, {
      reportId: report.id,
    });
  });

  // 6. Switch back to admin and erase the report
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  await api.functional.communityPlatform.admin.reports.erase(connection, {
    reportId: report.id,
  });

  // 7. Try to delete the same report again (should error - already deleted)
  await TestValidator.error(
    "cannot delete already deleted report",
    async () => {
      await api.functional.communityPlatform.admin.reports.erase(connection, {
        reportId: report.id,
      });
    },
  );

  // 8. Try to delete a random non-existent report
  await TestValidator.error("cannot delete non-existent report", async () => {
    await api.functional.communityPlatform.admin.reports.erase(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // Final note: report retrieval endpoint is not part of the test contract, so not validated here.
}

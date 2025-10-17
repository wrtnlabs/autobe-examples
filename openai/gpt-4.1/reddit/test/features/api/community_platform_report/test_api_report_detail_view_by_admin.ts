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
 * E2E test for admin viewing report details endpoint.
 *
 * 1. Register a platform admin (admin join)
 * 2. Admin creates a report category
 * 3. Register a community member (member join)
 * 4. Have member file a report (report create) with the created category (for
 *    simplicity, supply dummy post_id)
 * 5. Re-authenticate as admin
 * 6. As admin, GET /communityPlatform/admin/reports/{reportId} - fetch and
 *    validate full details; assert all workflow, moderation, and reporter
 *    fields visible, no redaction, correct match to report submitted
 * 7. Confirm that audit logging occurs for access (business assertion)
 * 8. Attempt to fetch report details as non-admin (member): expect error
 *    (permission denied)
 * 9. As admin, attempt GET of a non-existent reportId: expect error (not found)
 */
export async function test_api_report_detail_view_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongAdminPassw0rd!",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates a report category
  const category =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberPassw0rd!",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member submits a content report
  // Use member session (token automatically set by SDK)
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        report_category_id: category.id,
        post_id: typia.random<string & tags.Format<"uuid">>(),
        reason_text: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 5: Log back in as admin
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongAdminPassw0rd!",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // Step 6: Admin fetches report details
  const reportDetail = await api.functional.communityPlatform.admin.reports.at(
    connection,
    { reportId: report.id },
  );
  typia.assert(reportDetail);
  TestValidator.equals(
    "admin sees full report details",
    reportDetail.id,
    report.id,
  );
  TestValidator.equals(
    "category is correct",
    reportDetail.report_category_id,
    category.id,
  );
  TestValidator.equals(
    "reporting member correct",
    reportDetail.reporting_member_id,
    member.id,
  );
  TestValidator.predicate(
    "admin sees workflow/moderation fields",
    typeof reportDetail.status === "string" &&
      "moderation_result" in reportDetail,
  );

  // Step 7: Audit logging for admin access is expected (business assertion, not api observable)
  // Step 8: Member cannot access same detail endpoint (should error)
  // Use member token (set back to member)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberPassw0rd!",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "member forbidden from admin report detail",
    async () => {
      await api.functional.communityPlatform.admin.reports.at(connection, {
        reportId: report.id,
      });
    },
  );

  // Step 9: Admin attempts to fetch non-existent report
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongAdminPassw0rd!",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin gets not found for non-existent report ID",
    async () => {
      await api.functional.communityPlatform.admin.reports.at(connection, {
        reportId: nonExistentId,
      });
    },
  );
}

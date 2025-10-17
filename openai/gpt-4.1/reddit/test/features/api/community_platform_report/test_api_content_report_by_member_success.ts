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
 * Validates that an authenticated member can successfully report inappropriate
 * content, covering registering a member, creating a report category as admin,
 * and submitting a report. Checks correct property assignments, category
 * linkage, and expected status.
 *
 * 1. Register a new admin for category creation.
 * 2. Create a report category as that admin.
 * 3. Register a new member for report submission.
 * 4. Have the member submit a report referencing the new category (simulate post
 *    ID).
 * 5. Validate the response for expected structure, linkage, and status.
 * 6. Optionally check that duplicate report (same member, content, category)
 *    fails.
 */
export async function test_api_content_report_by_member_success(
  connection: api.IConnection,
) {
  // 1. Register an admin for setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        superuser: true,
      },
    });
  typia.assert(admin);

  // 2. Create a report category as admin
  const categoryBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    allow_free_text: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformReportCategory.ICreate;
  const category: ICommunityPlatformReportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);
  TestValidator.equals("category name", category.name, categoryBody.name);
  TestValidator.equals(
    "category allow_free_text",
    category.allow_free_text,
    categoryBody.allow_free_text,
  );

  // 3. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
      },
    });
  typia.assert(member);

  // 4. Member submits a report
  // Simulate a post_id as UUID since we lack post creation API in this scope
  const dummyPostId = typia.random<string & tags.Format<"uuid">>();
  const reportBody = {
    post_id: dummyPostId,
    report_category_id: category.id,
    reason_text: category.allow_free_text
      ? RandomGenerator.paragraph({ sentences: 3 })
      : undefined,
  } satisfies ICommunityPlatformReport.ICreate;
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("report post_id matches", report.post_id, dummyPostId);
  TestValidator.equals(
    "report category matches",
    report.report_category_id,
    category.id,
  );
  TestValidator.equals(
    "reporting member matches",
    report.reporting_member_id,
    member.id,
  );
  if (category.allow_free_text) {
    TestValidator.equals(
      "free text matches",
      report.reason_text,
      reportBody.reason_text,
    );
  } else {
    TestValidator.equals(
      "free text is omitted or null",
      report.reason_text,
      null,
    );
  }
}

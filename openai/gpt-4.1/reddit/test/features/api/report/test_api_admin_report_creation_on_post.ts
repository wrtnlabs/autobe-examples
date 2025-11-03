import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportActions";
import type { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";
import type { ICommunityPlatformReportOfPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPosts";
import type { ICommunityPlatformReports } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReports";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an admin can successfully create a new report targeting a post.
 * The test checks the end-to-end workflow: (1) Register as a new admin; (2) Use
 * the new admin session to submit a report via the admin report endpoint,
 * explicitly targeting a post (not a comment) and providing all required
 * information (report type, description, post association); (3) Validate that
 * the report is created with all required fields, including type, status,
 * timestamps, actor info, and content associations; (4) Confirm the returned
 * report has correct associations (post_report set, comment_report null) and
 * proper data consistency (status open, auto_hidden boolean, actor is admin);
 * (5) Assert key business rules—duplicate report attempts fail, and audit data
 * is complete. This scenario focuses on admin context, post targeting, and
 * system auditability.
 */
export async function test_api_admin_report_creation_on_post(
  connection: api.IConnection,
) {
  // 1. Register as a new admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!01",
    display_name: RandomGenerator.name(),
    href: "https://admin-panel.example.com/onboard",
    referrer: "https://landing.example.com/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.ICreate;
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);
  TestValidator.equals(
    "admin email should match",
    admin.email,
    adminBody.email,
  );
  TestValidator.equals(
    "admin display name should match",
    admin.display_name,
    adminBody.display_name,
  );
  TestValidator.predicate(
    "admin should have id",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  TestValidator.predicate(
    "admin should have token",
    typeof admin.token === "object",
  );

  // 2. Create a report targeting a post
  const target_post_id = typia.random<string & tags.Format<"uuid">>();
  const reportBody = {
    report_type: RandomGenerator.pick([
      "spam",
      "abuse",
      "off_topic",
      "harassment",
      "explicit_content",
      "other",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    target_post_id,
    target_comment_id: null,
  } satisfies ICommunityPlatformReports.ICreate;
  const report: ICommunityPlatformReports =
    await api.functional.communityPlatform.admin.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);
  TestValidator.equals(
    "report type matches",
    report.report_type,
    reportBody.report_type,
  );
  TestValidator.equals("report status set to open", report.status, "open");
  TestValidator.equals(
    "target post id matches",
    report.post_report?.target_post_id,
    target_post_id,
  );
  TestValidator.equals(
    "reporter_user is null (admin context)",
    report.reporter_user,
    null,
  );
  TestValidator.predicate(
    "reporter_admin should exist",
    !!report.reporter_admin &&
      report.reporter_admin.display_name === adminBody.display_name,
  );
  TestValidator.predicate(
    "actions is array or undefined",
    Array.isArray(report.actions) || typeof report.actions === "undefined",
  );
  TestValidator.predicate(
    "auto_hidden is boolean",
    typeof report.auto_hidden === "boolean",
  );
  TestValidator.equals(
    "comment_report should be null",
    report.comment_report,
    null,
  );
  TestValidator.predicate(
    "created_at should be ISO string",
    typeof report.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T[\d:.]+Z/.test(report.created_at),
  );
  TestValidator.predicate(
    "updated_at should be ISO string",
    typeof report.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T[\d:.]+Z/.test(report.updated_at),
  );

  // 3. Attempt to create a duplicate report (should fail by business rule)
  await TestValidator.error(
    "duplicate report attempt should fail",
    async () => {
      await api.functional.communityPlatform.admin.reports.create(connection, {
        body: reportBody,
      });
    },
  );
}

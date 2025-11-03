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
 * Validates platform report detail retrieval by an admin (report creator) and
 * ensures that a normal user cannot access the detail of an admin-created
 * report.
 *
 * Test scenario:
 *
 * 1. Register a new admin account (reporter_admin)
 * 2. Admin creates a report (report_type/post association)
 * 3. Admin retrieves the report via user report detail API (as reporter_admin -
 *    allowed)
 * 4. Register a random user
 * 5. Random user attempts to retrieve report by ID (access should be denied)
 *
 * This workflow validates:
 *
 * - All detail fields of the report match the admin's submission
 * - The admin (report owner) has access
 * - Access control: regular users cannot access reports where they are not a
 *   reporter
 */
export async function test_api_user_report_detail_retrieval_by_reporter(
  connection: api.IConnection,
) {
  // 1. Register the admin (reporter_admin)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminDisplayName = RandomGenerator.name();
  const adminPwd = RandomGenerator.alphaNumeric(16);
  const joinAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPwd,
      display_name: adminDisplayName,
      href: "https://app.example.com/admin/register",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(joinAdmin);

  // 2. As admin, create a report
  const reportTypeChoices = [
    "spam",
    "abuse",
    "off_topic",
    "harassment",
    "explicit_content",
    "other",
  ] as const;
  const reportType = RandomGenerator.pick(reportTypeChoices);
  const targetPostId = typia.random<string & tags.Format<"uuid">>();
  const description = RandomGenerator.paragraph({ sentences: 7 });
  const createReportPayload = {
    report_type: reportType,
    description,
    target_post_id: targetPostId,
    target_comment_id: null,
  } satisfies ICommunityPlatformReports.ICreate;
  const report = await api.functional.communityPlatform.admin.reports.create(
    connection,
    { body: createReportPayload },
  );
  typia.assert(report);

  // 3. As admin, retrieve the report detail by ID
  const reportDetail = await api.functional.communityPlatform.user.reports.at(
    connection,
    { reportId: report.id },
  );
  typia.assert(reportDetail);
  TestValidator.equals("report id matches", reportDetail.id, report.id);
  TestValidator.equals(
    "report type matches",
    reportDetail.report_type,
    createReportPayload.report_type,
  );
  TestValidator.equals(
    "report status present (string)",
    typeof reportDetail.status,
    "string",
  );
  TestValidator.equals(
    "description matches",
    reportDetail.description,
    createReportPayload.description,
  );
  TestValidator.equals(
    "post_report target_post_id",
    reportDetail.post_report?.target_post_id,
    createReportPayload.target_post_id,
  );

  // 4. Register a normal user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userDisplayName = RandomGenerator.name();
  const userPwd = RandomGenerator.alphaNumeric(12);
  const joinUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPwd,
      display_name: userDisplayName,
      href: "https://app.example.com/register",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(joinUser);

  // 5. Normal user tries to fetch detail and is denied
  await TestValidator.error(
    "access denied: non-reporter user cannot retrieve admin-created report detail",
    async () => {
      await api.functional.communityPlatform.user.reports.at(connection, {
        reportId: report.id,
      });
    },
  );
}

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
 * Test admin retrieval of full details for a submitted content report including
 * audit, associations, and permissions.
 *
 * 1. Register a new admin through /auth/admin/join, obtaining an authenticated
 *    session.
 * 2. As admin, submit a new report for a (simulated) post.
 * 3. Retrieve report details by reportId using
 *    /communityPlatform/admin/reports/{reportId}.
 * 4. Assert all required fields and associations are present in the response.
 * 5. Attempt to retrieve the report with a random non-existent reportId; verify
 *    error occurs.
 * 6. Attempt to retrieve the report as an unauthenticated user; verify error
 *    occurs.
 */
export async function test_api_admin_report_detail_access_and_audit(
  connection: api.IConnection,
) {
  // 1. Register a new admin to create a privileged session
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      href: "https://community.example.com/join",
      referrer: "https://community.example.com/ref",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Submit content report as admin (simulate a post report)
  // Use new random UUID as target_post_id, leave target_comment_id null
  const reportCreate =
    await api.functional.communityPlatform.admin.reports.create(connection, {
      body: {
        report_type: RandomGenerator.pick([
          "spam",
          "abuse",
          "off_topic",
          "harassment",
          "explicit_content",
          "other",
        ] as const),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        target_post_id: typia.random<string & tags.Format<"uuid">>(),
        target_comment_id: null,
      } satisfies ICommunityPlatformReports.ICreate,
    });
  typia.assert(reportCreate);

  // 3. Retrieve the report details via GET, using authenticated admin
  const reportFetched = await api.functional.communityPlatform.admin.reports.at(
    connection,
    {
      reportId: reportCreate.id,
    },
  );
  typia.assert(reportFetched);
  // 4. Assert essential report fields and associations
  TestValidator.equals("report id matches", reportFetched.id, reportCreate.id);
  TestValidator.equals(
    "report type matches",
    reportFetched.report_type,
    reportCreate.report_type,
  );
  TestValidator.equals("status present", typeof reportFetched.status, "string");
  // Assert reporter_admin is present and matches
  TestValidator.predicate(
    "reporter_admin present and correct",
    !!reportFetched.reporter_admin &&
      reportFetched.reporter_admin.display_name === adminJoin.display_name,
  );
  // description may be nullable
  if (
    reportCreate.description !== null &&
    reportCreate.description !== undefined
  ) {
    TestValidator.equals(
      "description matches",
      reportFetched.description,
      reportCreate.description,
    );
  }
  // Must not have reporter_user (reported by admin, not user)
  TestValidator.equals("no reporter_user", reportFetched.reporter_user, null);
  // Audit trail must be present for admin, can be empty array
  TestValidator.predicate(
    "actions present for admin context",
    Array.isArray(reportFetched.actions),
  );
  TestValidator.predicate(
    "auto_hidden is boolean",
    typeof reportFetched.auto_hidden === "boolean",
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof reportFetched.created_at === "string" &&
      reportFetched.created_at.includes("T"),
  );
  // Must refer to post; association object present for post_report, null for comment_report
  TestValidator.predicate(
    "post_report present for post report",
    !!reportFetched.post_report &&
      reportFetched.post_report.report_id === reportFetched.id,
  );
  TestValidator.equals(
    "comment_report is null for post report",
    reportFetched.comment_report,
    null,
  );
  // 5. Try to fetch report details using a non-existent reportId (expect error)
  await TestValidator.error("error on non-existent reportId", async () => {
    await api.functional.communityPlatform.admin.reports.at(connection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
  // 6. Attempt to fetch report as unauthenticated user
  const unauthenticated: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot fetch report detail",
    async () => {
      await api.functional.communityPlatform.admin.reports.at(unauthenticated, {
        reportId: reportCreate.id,
      });
    },
  );
}

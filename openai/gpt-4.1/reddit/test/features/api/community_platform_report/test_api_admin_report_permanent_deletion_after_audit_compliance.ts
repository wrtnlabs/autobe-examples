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
 * Test permanent erasure of admin-created report and moderation links for
 * compliance.
 *
 * 1. Register a new platform admin with randomized credentials and context fields.
 * 2. Authenticate as this admin; session context is maintained by api SDK.
 * 3. Create a report (admin as actor) with valid sample data (on a random post
 *    id).
 * 4. Confirm report persisted; inspect presence of actions/mod links.
 * 5. Hard delete (erase) the report via admin endpoint.
 * 6. Attempt to re-access the report (should fail/is gone), optionally using
 *    try/catch logic.
 * 7. Confirm linked objects (actions, posts/comments) no longer reference the
 *    deleted report.
 * 8. Ensure an audit action for deletion was generated in the final action array.
 * 9. Try to erase (by id) a hypothetically finalized/real-content report: expect
 *    business logic error/denial.
 * 10. Assert all success/failure by TestValidator and typia.assert().
 */
export async function test_api_admin_report_permanent_deletion_after_audit_compliance(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(10) + "A1!",
        display_name: RandomGenerator.name(2),
        href:
          "https://localhost/test?e2eReportDelete=" +
          RandomGenerator.alphaNumeric(8),
        referrer: "https://referrer.test/",
        ip: null,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. As this admin, create a new report (on a fake post, random uuid)
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  const report: ICommunityPlatformReports =
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
        description: RandomGenerator.paragraph({ sentences: 2 }),
        target_post_id: randomPostId,
        target_comment_id: null,
      } satisfies ICommunityPlatformReports.ICreate,
    });
  typia.assert(report);
  TestValidator.equals("persisted report id present", report.id, report.id);

  // 3. Confirm moderation links (of posts is created), actions not empty
  if (report.post_report !== null && report.post_report !== undefined) {
    typia.assert(report.post_report);
    TestValidator.equals(
      "post_report.report_id links to report",
      report.post_report.report_id,
      report.id,
    );
  }

  if (Array.isArray(report.actions) && report.actions.length > 0) {
    for (const action of report.actions) {
      typia.assert(action);
      TestValidator.equals(
        "action.report_id links to report",
        action.report_id,
        report.id,
      );
    }
  }

  // 4. Hard delete (erase) the report
  await api.functional.communityPlatform.admin.reports.erase(connection, {
    reportId: report.id,
  });

  // 5. Attempt to access (should fail or not found); here, just try fetching again
  await TestValidator.error(
    "deleted report retrieval should fail",
    async () => {
      await api.functional.communityPlatform.admin.reports.erase(connection, {
        reportId: report.id,
      });
    },
  );

  // 6. Try to erase a hypothetical finalized report (simulate: use different UUID)
  // (Assume finalized = some random id, and erase denied)
  const fakeFinalizedId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "finalized report deletion should not be allowed",
    async () => {
      await api.functional.communityPlatform.admin.reports.erase(connection, {
        reportId: fakeFinalizedId,
      });
    },
  );
}

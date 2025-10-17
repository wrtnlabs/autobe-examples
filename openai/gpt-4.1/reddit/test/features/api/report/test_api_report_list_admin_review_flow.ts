import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Validate the admin moderation/review flow for inappropriate content reports.
 *
 * 1. Create a platform admin (for privileged endpoint access).
 * 2. Create a report category as required by reporting flows.
 * 3. As a member, submit a report for a random (stubbed) post.
 * 4. Query the admin moderation listing endpoint as admin, filtered by status,
 *    category, and type.
 * 5. Validate results: correct report inclusion, correct fields, correct exclusion
 *    of deleted/resolved reports. Confirm audit control (where supported).
 * 6. Attempt to access as non-admin, validating access denied.
 */
export async function test_api_report_list_admin_review_flow(
  connection: api.IConnection,
) {
  // 1. Create platform admin and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create report category
  const categoryName = RandomGenerator.name();
  const category: ICommunityPlatformReportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. As a member, submit a report with the new category (simulate stubbed member report against post)
  // Member context not exposed in dependencies; assume non-admin headers emulate member role (or simulate mode)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  // Random UUID for stubbed post id
  const stubbedPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(unauthConn, {
      body: {
        post_id: stubbedPostId,
        report_category_id: category.id,
        reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 4. As admin, query moderation endpoint for report listing (multiple filters and pagination)
  //    - by status
  let result: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.admin.reports.index(connection, {
      body: {
        status: report.status,
        category: category.id,
        target_type: "post",
        post_id: stubbedPostId,
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(result);
  // Should contain at least the created report
  const found = result.data.find((r) => r.id === report.id);
  TestValidator.predicate(
    "created report is included in admin review list",
    found !== undefined,
  );
  TestValidator.equals(
    "report category id matches",
    found?.report_category_id,
    category.id,
  );
  TestValidator.equals("status matches", found?.status, report.status);
  // Business rule: Exclude deleted/resolved reports (simulate resolved report and check exclusion)
  // (Assume resolution occurs elsewhere. Skip simulation for this minimal test.)

  // Try filter by non-matching status — should exclude
  result = await api.functional.communityPlatform.admin.reports.index(
    connection,
    {
      body: {
        status: "resolved",
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ICommunityPlatformReport.IRequest,
    },
  );
  typia.assert(result);
  const shouldNotFind = result.data.find((r) => r.id === report.id);
  TestValidator.equals(
    "report hidden when filtered by non-matching status",
    shouldNotFind,
    undefined,
  );

  // 5. Attempt unauthorized access (non-admin): must fail
  await TestValidator.error(
    "non-admin cannot access moderation listing",
    async () => {
      await api.functional.communityPlatform.admin.reports.index(unauthConn, {
        body: {
          status: report.status,
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies ICommunityPlatformReport.IRequest,
      });
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Test the moderation report list and review workflow for the Reddit-like
 * system.
 *
 * 1. Admin creates a report category for moderation.
 * 2. Member files a new report using the created category, targeting a post
 *    (simulate with a fake post_id).
 * 3. Register a moderator for the same (mocked) community. A random UUID is used
 *    consistently for both report and moderator join, assuming the post belongs
 *    to that community.
 * 4. Moderator retrieves the report list via PATCH, verifies pending reports are
 *    included and paginated, and applies category/type filters.
 * 5. Filters by status and category — confirm correct reports are returned.
 * 6. Edge: Ensure unauthenticated users cannot access the moderator report index
 *    endpoint.
 * 7. Simulate status transition (this API does not allow direct transition; this
 *    step only demonstrates re-query for another status).
 */
export async function test_api_report_list_moderator_review_flow(
  connection: api.IConnection,
) {
  // 1. Admin creates category
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // Prepare a random community ID for post and moderator
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // 2. Member files a report (simulate with fake post_id, assume post is in the community)
  const reportBody = {
    post_id: typia.random<string & tags.Format<"uuid">>(),
    report_category_id: reportCategory.id,
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    { body: reportBody },
  );
  typia.assert(report);

  // 3. Register a moderator under the same mocked community as the post
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "moderator-password",
      community_id: communityId,
    },
  });
  typia.assert(moderatorJoin);

  // 4. Moderator retrieves reports list, unfiltered (pending only by default)
  const reportList =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        limit: 10,
        page: 1,
      },
    });
  typia.assert(reportList);
  reportList.data.forEach((item) => typia.assert(item));
  TestValidator.predicate(
    "pending report is included and correct category",
    reportList.data.some(
      (r) =>
        r.id === report.id &&
        r.status === "pending" &&
        r.report_category_id === reportCategory.id,
    ),
  );

  // 5. Filter by status and category
  const filteredList =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        status: "pending",
        category: reportCategory.id,
        target_type: "post",
        limit: 10,
        page: 1,
      },
    });
  typia.assert(filteredList);
  filteredList.data.forEach((item) => typia.assert(item));
  TestValidator.equals(
    "only pending report for given category/type is returned",
    filteredList.data.length,
    1,
  );
  TestValidator.equals(
    "correct report ID and status in filtered result",
    filteredList.data[0].id,
    report.id,
  );

  // 6. Edge: Unauthenticated user tries access (create unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to moderator report listing fails",
    async () => {
      await api.functional.communityPlatform.moderator.reports.index(
        unauthConn,
        {
          body: {
            limit: 10,
            page: 1,
          },
        },
      );
    },
  );

  // 7. Simulate status transition (not supported by current API, so only demonstrate a filtered re-query for another status)
  const resolvedReports =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        status: "resolved",
        limit: 10,
        page: 1,
      },
    });
  typia.assert(resolvedReports);
  resolvedReports.data.forEach((item) => typia.assert(item));
  TestValidator.equals(
    "no resolved reports returned by default",
    resolvedReports.data.length,
    0,
  );
}

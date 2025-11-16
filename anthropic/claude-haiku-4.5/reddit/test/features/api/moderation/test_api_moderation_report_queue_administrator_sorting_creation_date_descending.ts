import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Administrator authentication and report queue sorting by creation date
 * (descending).
 *
 * This test validates that administrators can retrieve platform-wide moderation
 * reports sorted by creation date in descending order (newest first). The test
 * ensures that:
 *
 * - Administrator can authenticate successfully
 * - Reports are retrieved from the platform-wide queue
 * - Reports are properly sorted with most recently created appearing first
 * - Pagination information is correctly provided
 * - The sorting functionality helps administrators prioritize newest submissions
 *
 * Steps:
 *
 * 1. Create and authenticate as administrator
 * 2. Retrieve reports with created_at_desc sort parameter
 * 3. Validate response structure and pagination
 * 4. Verify reports are in descending order by creation date
 * 5. Confirm test completes successfully
 */
export async function test_api_moderation_report_queue_administrator_sorting_creation_date_descending(
  connection: api.IConnection,
) {
  // 1. Administrator joins and authenticates
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator authenticated successfully",
    administrator.id !== null && administrator.email_verified === false,
  );

  // 2. Retrieve reports sorted by creation date descending
  const reportResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          sort_by: "created_at_desc",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(reportResponse);

  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    reportResponse.pagination !== null &&
      reportResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is positive",
    reportResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    reportResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    reportResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    reportResponse.pagination.pages >= 0,
  );

  // 4. Validate reports array exists
  TestValidator.predicate(
    "reports data array exists",
    Array.isArray(reportResponse.data),
  );

  // 5. Verify reports are sorted by creation date in descending order (newest first)
  if (reportResponse.data.length > 1) {
    for (let i = 0; i < reportResponse.data.length - 1; i++) {
      const currentReport = reportResponse.data[i];
      const nextReport = reportResponse.data[i + 1];

      typia.assert(currentReport);
      typia.assert(nextReport);

      const currentDate = new Date(currentReport.created_at).getTime();
      const nextDate = new Date(nextReport.created_at).getTime();

      TestValidator.predicate(
        `report at index ${i} created_at (${currentReport.created_at}) >= report at index ${i + 1} created_at (${nextReport.created_at})`,
        currentDate >= nextDate,
      );
    }
  }

  // 6. Validate individual report structure
  if (reportResponse.data.length > 0) {
    const firstReport = reportResponse.data[0];
    typia.assert(firstReport);

    TestValidator.predicate(
      "first report has valid id",
      firstReport.id !== null && firstReport.id !== undefined,
    );
    TestValidator.predicate(
      "first report has valid category",
      firstReport.category !== null && firstReport.category !== undefined,
    );
    TestValidator.predicate(
      "first report has valid status",
      firstReport.status !== null && firstReport.status !== undefined,
    );
    TestValidator.predicate(
      "first report has valid priority",
      firstReport.priority !== null && firstReport.priority !== undefined,
    );
    TestValidator.predicate(
      "first report has valid created_at timestamp",
      firstReport.created_at !== null && firstReport.created_at !== undefined,
    );
    TestValidator.predicate(
      "first report has reporter information",
      firstReport.reporter !== null && firstReport.reporter !== undefined,
    );
  }
}

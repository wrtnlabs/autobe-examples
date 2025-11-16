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
 * Test combining multiple filters simultaneously at the administrator level.
 *
 * This test validates that administrators can effectively use complex filter
 * combinations to retrieve reports matching multiple specific criteria (status,
 * priority, and category). The test ensures that the report queue API correctly
 * filters reports where ALL specified filter conditions are satisfied, not just
 * some of them.
 *
 * Test flow:
 *
 * 1. Administrator authenticates to gain platform-wide access
 * 2. Apply combined filters: status='resolved' AND priority='critical' AND
 *    category='self_harm'
 * 3. Retrieve filtered report list
 * 4. Validate that all returned reports match ALL specified filter criteria
 * 5. Verify pagination information is correct
 * 6. Ensure no reports that don't match all criteria are included
 */
export async function test_api_moderation_report_queue_administrator_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Administrator authenticates
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator should be authenticated",
    admin.id !== undefined && admin.email_verified === false,
  );

  // Step 2: Apply combined filters - status='resolved' AND priority='critical' AND category='self_harm'
  const requestBody = {
    status: "resolved",
    priority: "critical",
    category: "self_harm",
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformReport.IRequest;

  // Step 3: Retrieve filtered report list
  const result: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(result);

  // Step 4: Validate that all returned reports match ALL specified filter criteria
  TestValidator.predicate(
    "pagination should have valid structure",
    result.pagination.current >= 0 &&
      result.pagination.limit > 0 &&
      result.pagination.records >= 0 &&
      result.pagination.pages >= 0,
  );

  // Validate each report in the results matches all filter criteria
  for (const report of result.data) {
    TestValidator.equals(
      "report status should match filter 'resolved'",
      report.status,
      "resolved",
    );
    TestValidator.equals(
      "report priority should match filter 'critical'",
      report.priority,
      "critical",
    );
    TestValidator.equals(
      "report category should match filter 'self_harm'",
      report.category,
      "self_harm",
    );
  }

  // Step 5: Verify pagination information consistency
  const expectedPages = Math.ceil(
    result.pagination.records / result.pagination.limit,
  );
  TestValidator.equals(
    "calculated pages should match pagination pages field",
    expectedPages,
    result.pagination.pages,
  );

  // Step 6: Ensure combined filter works correctly
  TestValidator.predicate(
    "all results should satisfy combined filter criteria",
    result.data.every(
      (report) =>
        report.status === "resolved" &&
        report.priority === "critical" &&
        report.category === "self_harm",
    ),
  );

  // Test with different combination of filters
  const alternativeFilter = {
    priority: "high",
    status: "in_review",
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformReport.IRequest;

  const alternativeResult: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: alternativeFilter,
      },
    );
  typia.assert(alternativeResult);

  // Validate alternative filter results
  TestValidator.predicate(
    "alternative filter results should match priority and status",
    alternativeResult.data.every(
      (report) => report.priority === "high" && report.status === "in_review",
    ),
  );
}

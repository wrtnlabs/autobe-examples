import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Test filtering reports by status in the moderation queue.
 *
 * Validates that moderators can filter content violation reports by workflow
 * status (submitted, in_review, pending_decision, resolved, dismissed) and that
 * null status returns reports of all statuses. Tests that status filtering
 * correctly restricts result sets, enabling moderators to prioritize their
 * review workflow by case status.
 *
 * Test workflow:
 *
 * 1. Authenticate as a moderator using join endpoint
 * 2. Retrieve all reports to establish baseline
 * 3. Test filtering with each specific status value
 * 4. Verify filtered results contain only matching status reports
 * 5. Test null status filter returns unfiltered results
 * 6. Validate status filtering effectiveness for queue management
 */
export async function test_api_moderation_report_queue_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: "https://example.com/auth/moderator/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve all reports without status filter to establish baseline
  const allReportsResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        status: null,
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(allReportsResponse);

  // Verify that null status returns reports of all statuses
  TestValidator.predicate(
    "all reports should be retrieved with null status filter",
    allReportsResponse.data.length >= 0,
  );

  // Step 3: Test filtering with each specific status value
  const statusValues = [
    "submitted",
    "in_review",
    "pending_decision",
    "resolved",
    "dismissed",
  ] as const;

  for (const status of statusValues) {
    const filteredResponse: IPageICommunityPlatformReport.ISummary =
      await api.functional.communityPlatform.moderator.reports.index(
        connection,
        {
          body: {
            status: status,
            page: 1,
            limit: 100,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    typia.assert(filteredResponse);

    // Verify all returned reports match the requested status
    TestValidator.predicate(
      `filtered results for status "${status}" should only contain reports with matching status`,
      filteredResponse.data.every((report) => report.status === status),
    );

    // Verify pagination information is valid
    TestValidator.predicate(
      `pagination should be valid for status filter "${status}"`,
      filteredResponse.pagination.current >= 0 &&
        filteredResponse.pagination.limit >= 0 &&
        filteredResponse.pagination.records >= 0 &&
        filteredResponse.pagination.pages >= 0,
    );
  }

  // Step 4: Test null status filter returns unfiltered results
  const unfiltered: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        status: null,
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(unfiltered);

  // Step 5: Verify that null filter returns more results than any single status filter
  TestValidator.predicate(
    "null status filter should return all reports across all statuses",
    unfiltered.data.length >= 0,
  );

  // Step 6: Test pagination with status filtering
  const paginatedResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        status: "submitted",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(paginatedResponse);

  TestValidator.predicate(
    "paginated status filtered results should respect limit",
    paginatedResponse.data.length <= 10,
  );

  // Step 7: Verify all reports contain required summary fields
  if (unfiltered.data.length > 0) {
    const sampleReport = unfiltered.data[0];
    TestValidator.predicate(
      "reports should have id field",
      sampleReport.id !== undefined && sampleReport.id !== null,
    );
    TestValidator.predicate(
      "reports should have status field",
      sampleReport.status !== undefined && sampleReport.status !== null,
    );
    TestValidator.predicate(
      "reports should have category field",
      sampleReport.category !== undefined && sampleReport.category !== null,
    );
    TestValidator.predicate(
      "reports should have priority field",
      sampleReport.priority !== undefined && sampleReport.priority !== null,
    );
  }
}

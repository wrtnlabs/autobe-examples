import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Test basic pagination functionality for content reports listing.
 *
 * Validates that pagination works correctly for moderators retrieving content
 * reports:
 *
 * 1. Moderator authenticates successfully
 * 2. Requests reports with page=1 and limit=10
 * 3. Verifies pagination metadata (current, limit, records, pages)
 * 4. Tests multiple page retrieval
 * 5. Confirms no data duplication across pages
 * 6. Validates page boundaries are respected
 *
 * Steps:
 *
 * 1. Create moderator account via authentication
 * 2. Request first page of reports (page=1, limit=10)
 * 3. Validate pagination structure and values
 * 4. Request second page and verify no data overlap
 * 5. Verify data consistency across pagination
 */
export async function test_api_content_reports_pagination_basic(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "SecurePassword123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request first page of reports with page=1, limit=10
  const firstPageResponse: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(firstPageResponse);

  // Step 3: Validate first page pagination metadata
  const pagination: IPage.IPagination = firstPageResponse.pagination;
  typia.assert(pagination);

  TestValidator.equals("first page number", pagination.current, 1);
  TestValidator.equals("page limit", pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  TestValidator.predicate(
    "data array length does not exceed limit",
    firstPageResponse.data.length <= pagination.limit,
  );

  // Step 4: Verify pages calculation is correct
  const expectedPages = Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages calculation matches records and limit",
    pagination.pages,
    expectedPages,
  );

  // Step 5: If there are multiple pages, test second page
  if (pagination.pages > 1) {
    const secondPageResponse: IPageIDiscussionBoardReport.ISummary =
      await api.functional.discussionBoard.moderator.moderation.content_reports.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IDiscussionBoardReport.IRequest,
        },
      );
    typia.assert(secondPageResponse);

    // Validate second page metadata
    TestValidator.equals(
      "second page number",
      secondPageResponse.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit",
      secondPageResponse.pagination.limit,
      10,
    );

    // Verify no data duplication between pages
    const firstPageIds = firstPageResponse.data.map((report) => report.id);
    const secondPageIds = secondPageResponse.data.map((report) => report.id);

    for (const secondId of secondPageIds) {
      TestValidator.predicate(
        `report ${secondId} should not appear in both pages`,
        !firstPageIds.includes(secondId),
      );
    }

    // Verify pagination consistency
    TestValidator.equals(
      "pagination metadata consistent across pages",
      secondPageResponse.pagination.records,
      pagination.records,
    );
    TestValidator.equals(
      "pages count consistent across pages",
      secondPageResponse.pagination.pages,
      pagination.pages,
    );
  }

  // Step 6: Validate data structure of returned reports
  if (firstPageResponse.data.length > 0) {
    const firstReport = firstPageResponse.data[0];
    typia.assert(firstReport);

    TestValidator.predicate(
      "report has valid id",
      typeof firstReport.id === "string",
    );
    TestValidator.predicate(
      "report has valid reason",
      typeof firstReport.reason === "string",
    );
    TestValidator.predicate(
      "report has valid status",
      typeof firstReport.status === "string",
    );
    TestValidator.predicate(
      "report has valid created_at",
      typeof firstReport.created_at === "string",
    );
    TestValidator.predicate(
      "report has reporter",
      firstReport.reporter !== undefined && firstReport.reporter !== null,
    );
  }
}

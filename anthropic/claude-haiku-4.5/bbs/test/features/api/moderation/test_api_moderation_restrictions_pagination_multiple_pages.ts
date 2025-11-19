import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountRestriction";

/**
 * Test pagination across multiple pages of moderation account restrictions.
 *
 * Validates that pagination works correctly when retrieving restriction records
 * across multiple pages. Authenticates as a moderator and requests pages 1, 2,
 * and 3 with a specific limit to ensure:
 *
 * 1. Each page contains the correct number of records respecting the limit
 * 2. Page numbers increment correctly across requests
 * 3. Total records count remains consistent across all pages
 * 4. No records are duplicated across different pages
 * 5. Pagination metadata is accurate for each response
 *
 * This test verifies the pagination system works correctly for large datasets
 * of account restrictions and enables moderators to browse restriction records
 * efficiently without data loss or duplication.
 */
export async function test_api_moderation_restrictions_pagination_multiple_pages(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123!";
  const moderatorUsername = RandomGenerator.alphabets(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Define pagination parameters
  const pageLimit = 5;
  const collectedRecords: IDiscussionBoardAccountRestriction[] = [];
  let totalRecordsCount: number | null = null;

  // Step 3: Request page 1
  const page1Response: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: pageLimit,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(page1Response);

  // Validate page 1 response structure
  TestValidator.equals(
    "page 1 current page number",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit value",
    page1Response.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "page 1 has non-negative records count",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 data length respects limit",
    page1Response.data.length <= pageLimit,
  );

  // Store total records count and page 1 records
  totalRecordsCount = page1Response.pagination.records;
  collectedRecords.push(...page1Response.data);

  // Step 4: Request page 2
  const page2Response: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 2,
          limit: pageLimit,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(page2Response);

  // Validate page 2 response structure
  TestValidator.equals(
    "page 2 current page number",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit value",
    page2Response.pagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "page 2 total records matches page 1",
    page2Response.pagination.records,
    totalRecordsCount,
  );
  TestValidator.predicate(
    "page 2 data length respects limit",
    page2Response.data.length <= pageLimit,
  );

  // Validate no duplicates between page 1 and page 2
  const page1Ids = new Set(collectedRecords.map((r) => r.id));
  for (const record of page2Response.data) {
    TestValidator.predicate(
      `record ${record.id} from page 2 is not in page 1`,
      !page1Ids.has(record.id),
    );
  }

  collectedRecords.push(...page2Response.data);

  // Step 5: Request page 3
  const page3Response: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 3,
          limit: pageLimit,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(page3Response);

  // Validate page 3 response structure
  TestValidator.equals(
    "page 3 current page number",
    page3Response.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 limit value",
    page3Response.pagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "page 3 total records matches previous pages",
    page3Response.pagination.records,
    totalRecordsCount,
  );
  TestValidator.predicate(
    "page 3 data length respects limit",
    page3Response.data.length <= pageLimit,
  );

  // Validate no duplicates between collected records and page 3
  const collectedIds = new Set(collectedRecords.map((r) => r.id));
  for (const record of page3Response.data) {
    TestValidator.predicate(
      `record ${record.id} from page 3 is not in previous pages`,
      !collectedIds.has(record.id),
    );
  }

  collectedRecords.push(...page3Response.data);

  // Step 6: Verify pagination consistency
  TestValidator.predicate(
    "collected records do not exceed total count",
    collectedRecords.length <= totalRecordsCount,
  );

  // Step 7: Verify total pages calculation
  const expectedTotalPages = Math.ceil(totalRecordsCount / pageLimit);
  TestValidator.equals(
    "page 1 total pages is correct",
    page1Response.pagination.pages,
    expectedTotalPages,
  );
  TestValidator.equals(
    "page 2 total pages is correct",
    page2Response.pagination.pages,
    expectedTotalPages,
  );
  TestValidator.equals(
    "page 3 total pages is correct",
    page3Response.pagination.pages,
    expectedTotalPages,
  );

  // Step 8: Verify all collected records have valid structure
  for (const record of collectedRecords) {
    typia.assert<IDiscussionBoardAccountRestriction>(record);
    TestValidator.predicate(
      `record ${record.id} has valid restriction_type`,
      ["posting_restriction", "temporary_suspension", "permanent_ban"].includes(
        record.restriction_type,
      ),
    );
    TestValidator.predicate(
      `record ${record.id} has valid status`,
      ["active", "lifted", "expired"].includes(record.status),
    );
  }
}

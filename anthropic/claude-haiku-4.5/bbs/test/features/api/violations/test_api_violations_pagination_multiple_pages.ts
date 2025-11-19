import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentViolationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentViolationRecord";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentViolationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentViolationRecord";

/**
 * Test pagination through multiple pages of violation records.
 *
 * This test validates the moderator's ability to navigate through large
 * violation datasets using pagination. It verifies that:
 *
 * 1. A moderator can authenticate and access violation records
 * 2. Page 1 returns the first set of violation records (current=1)
 * 3. Page 2 returns a different set of violation records (current=2)
 * 4. Pagination metadata updates correctly for each page
 * 5. Items returned on different pages are unique
 * 6. The system handles multi-page navigation properly
 *
 * This ensures moderators can efficiently browse through all violations in the
 * system for enforcement decision-making.
 */
export async function test_api_violations_pagination_multiple_pages(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request violations on page 1 with limit of 20 items per page
  const page1Result: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(page1Result);

  // Validate page 1 pagination metadata
  TestValidator.equals(
    "page 1 current page number should be 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should be 20",
    page1Result.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "page 1 should have items",
    page1Result.data.length > 0,
  );

  // Store page 1 violation IDs for comparison
  const page1ViolationIds = page1Result.data.map((v) => v.id);

  // Step 3: Request violations on page 2 with the same limit
  const page2Result: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(page2Result);

  // Validate page 2 pagination metadata
  TestValidator.equals(
    "page 2 current page number should be 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit should be 20",
    page2Result.pagination.limit,
    20,
  );

  // Store page 2 violation IDs for comparison
  const page2ViolationIds = page2Result.data.map((v) => v.id);

  // Step 4: Validate that pagination metadata is consistent
  TestValidator.equals(
    "pagination limit should remain constant across pages",
    page1Result.pagination.limit,
    page2Result.pagination.limit,
  );

  TestValidator.predicate(
    "page 2 current should be different from page 1 current",
    page2Result.pagination.current !== page1Result.pagination.current,
  );

  // Step 5: Validate that violation items are unique across pages
  const allViolationIds = [...page1ViolationIds, ...page2ViolationIds];
  const uniqueViolationIds = new Set(allViolationIds);

  TestValidator.equals(
    "all violation IDs across pages should be unique",
    uniqueViolationIds.size,
    allViolationIds.length,
  );

  // Step 6: Validate that page 1 and page 2 have different items
  const page1IdSet = new Set(page1ViolationIds);
  const overlappingIds = page2ViolationIds.filter((id) => page1IdSet.has(id));

  TestValidator.equals(
    "page 1 and page 2 should have no overlapping violation IDs",
    overlappingIds.length,
    0,
  );

  // Step 7: Validate violation record structure for both pages
  page1Result.data.forEach((violation) => {
    typia.assert(violation);
    TestValidator.predicate(
      "violation should have valid id",
      violation.id.length > 0,
    );
    TestValidator.predicate(
      "violation should have violation_type",
      violation.violation_type.length > 0,
    );
  });

  page2Result.data.forEach((violation) => {
    typia.assert(violation);
    TestValidator.predicate(
      "violation should have valid id",
      violation.id.length > 0,
    );
    TestValidator.predicate(
      "violation should have violation_type",
      violation.violation_type.length > 0,
    );
  });

  // Step 8: Validate that total records metadata is consistent
  TestValidator.equals(
    "total records should be consistent across pages",
    page1Result.pagination.records,
    page2Result.pagination.records,
  );

  TestValidator.equals(
    "total pages should be consistent across pages",
    page1Result.pagination.pages,
    page2Result.pagination.pages,
  );
}

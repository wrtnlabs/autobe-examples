import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test pagination through large suspension result sets.
 *
 * A moderator authenticates and retrieves suspension records with page=1
 * (limit=20), then page=2, then page=3 to verify correct pagination boundaries.
 * Validates that each page contains the correct items, pagination metadata is
 * accurate, and no duplicates or gaps exist across pages. Tests efficient
 * navigation of large suspension lists.
 *
 * Test Flow:
 *
 * 1. Create a moderator account via authentication
 * 2. Retrieve suspension records page 1 (page=1, limit=20)
 * 3. Retrieve suspension records page 2 (page=2, limit=20)
 * 4. Retrieve suspension records page 3 (page=3, limit=20)
 * 5. Validate pagination metadata for all pages
 * 6. Verify no duplicates or gaps across pages
 * 7. Confirm data consistency across pagination boundaries
 */
export async function test_api_moderation_suspensions_pagination_traversal(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve suspension records page 1
  const page1: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(page1);

  // Step 3: Retrieve suspension records page 2
  const page2: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(page2);

  // Step 4: Retrieve suspension records page 3
  const page3: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 3,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(page3);

  // Step 5: Validate pagination metadata for all pages
  TestValidator.equals(
    "page 1 pagination current page",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 20);
  TestValidator.predicate(
    "page 1 pagination records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pagination pages is non-negative",
    page1.pagination.pages >= 0,
  );

  TestValidator.equals(
    "page 2 pagination current page",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 20);
  TestValidator.equals(
    "page 2 pagination records matches page 1",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 2 pagination pages matches page 1",
    page2.pagination.pages,
    page1.pagination.pages,
  );

  TestValidator.equals(
    "page 3 pagination current page",
    page3.pagination.current,
    3,
  );
  TestValidator.equals("page 3 pagination limit", page3.pagination.limit, 20);
  TestValidator.equals(
    "page 3 pagination records matches page 1",
    page3.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 3 pagination pages matches page 1",
    page3.pagination.pages,
    page1.pagination.pages,
  );

  // Step 6: Verify no duplicates across pages
  const page1Ids = page1.data.map((item) => item.id);
  const page2Ids = page2.data.map((item) => item.id);
  const page3Ids = page3.data.map((item) => item.id);

  const allIds = [...page1Ids, ...page2Ids, ...page3Ids];
  const uniqueIds = new Set(allIds);

  TestValidator.predicate(
    "no duplicate suspensions across pages",
    allIds.length === uniqueIds.size,
  );

  // Step 7: Validate data consistency
  TestValidator.predicate(
    "page 1 has correct data count",
    page1.data.length <= 20,
  );
  TestValidator.predicate(
    "page 2 has correct data count",
    page2.data.length <= 20,
  );
  TestValidator.predicate(
    "page 3 has correct data count",
    page3.data.length <= 20,
  );

  // Validate suspension data structure for first page items
  for (const suspension of page1.data) {
    typia.assert(suspension);
    TestValidator.predicate(
      "suspension has valid id",
      typeof suspension.id === "string" && suspension.id.length > 0,
    );
    TestValidator.predicate(
      "suspension has valid moderator",
      suspension.moderator && typeof suspension.moderator.id === "string",
    );
    TestValidator.predicate(
      "suspension has valid suspension_type",
      ["posting_restriction", "account_suspension", "permanent_ban"].includes(
        suspension.suspension_type,
      ),
    );
    TestValidator.predicate(
      "suspension has valid status",
      ["active", "lifted", "expired"].includes(suspension.status),
    );
  }

  // Validate pagination consistency
  if (page1.pagination.records > 20) {
    TestValidator.predicate(
      "page 1 is full when more records exist",
      page1.data.length === 20,
    );
  }

  if (page2.pagination.records > 40) {
    TestValidator.predicate(
      "page 2 is full when more records exist",
      page2.data.length === 20,
    );
  }
}

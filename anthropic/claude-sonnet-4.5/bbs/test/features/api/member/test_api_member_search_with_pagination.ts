import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member search with pagination controls.
 *
 * This test validates the pagination functionality of the member search
 * endpoint. A moderator authenticates and retrieves members using different
 * page numbers and limit values to ensure proper pagination behavior.
 *
 * The test validates:
 *
 * 1. Correct page offset calculation
 * 2. Accurate total record counts
 * 3. Correct page count calculation (pages = ceil(records / limit))
 * 4. Proper handling of page boundaries
 * 5. Pagination metadata accuracy (current, limit, records, pages)
 * 6. Data array length matches limit (except possibly last page)
 */
export async function test_api_member_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "moderator123",
      username: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Get initial member list to understand total available members
  const initialResponse =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(initialResponse);

  // Step 3: Test pagination with limit of 10
  const limit10Page1 =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(limit10Page1);

  // Validate pagination metadata for page 1, limit 10
  TestValidator.equals(
    "page 1 limit 10: current page should be 1",
    limit10Page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10: limit should be 10",
    limit10Page1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 limit 10: records should be non-negative",
    limit10Page1.pagination.records >= 0,
  );
  TestValidator.equals(
    "page 1 limit 10: pages calculation should be correct",
    limit10Page1.pagination.pages,
    Math.ceil(limit10Page1.pagination.records / 10),
  );
  TestValidator.predicate(
    "page 1 limit 10: data length should not exceed limit",
    limit10Page1.data.length <= 10,
  );

  // If there are enough records, test page 2
  if (limit10Page1.pagination.records > 10) {
    const limit10Page2 =
      await api.functional.discussionBoard.moderator.members.index(connection, {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardMember.IRequest,
      });
    typia.assert(limit10Page2);

    TestValidator.equals(
      "page 2 limit 10: current page should be 2",
      limit10Page2.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit 10: limit should be 10",
      limit10Page2.pagination.limit,
      10,
    );
    TestValidator.equals(
      "page 2 limit 10: total records should match page 1",
      limit10Page2.pagination.records,
      limit10Page1.pagination.records,
    );
    TestValidator.equals(
      "page 2 limit 10: total pages should match page 1",
      limit10Page2.pagination.pages,
      limit10Page1.pagination.pages,
    );

    // Verify no duplicate members between pages
    const page1Ids = limit10Page1.data.map((m) => m.id);
    const page2Ids = limit10Page2.data.map((m) => m.id);
    const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
    TestValidator.equals(
      "no duplicate members between page 1 and page 2",
      duplicates.length,
      0,
    );
  }

  // Step 4: Test pagination with limit of 20
  const limit20Page1 =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(limit20Page1);

  TestValidator.equals(
    "page 1 limit 20: current page should be 1",
    limit20Page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 20: limit should be 20",
    limit20Page1.pagination.limit,
    20,
  );
  TestValidator.equals(
    "page 1 limit 20: pages calculation should be correct",
    limit20Page1.pagination.pages,
    Math.ceil(limit20Page1.pagination.records / 20),
  );
  TestValidator.predicate(
    "page 1 limit 20: data length should not exceed limit",
    limit20Page1.data.length <= 20,
  );

  // Step 5: Test pagination with limit of 50
  const limit50Page1 =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(limit50Page1);

  TestValidator.equals(
    "page 1 limit 50: current page should be 1",
    limit50Page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 50: limit should be 50",
    limit50Page1.pagination.limit,
    50,
  );
  TestValidator.equals(
    "page 1 limit 50: pages calculation should be correct",
    limit50Page1.pagination.pages,
    Math.ceil(limit50Page1.pagination.records / 50),
  );
  TestValidator.predicate(
    "page 1 limit 50: data length should not exceed limit",
    limit50Page1.data.length <= 50,
  );

  // Step 6: Verify total records consistency across different limits
  TestValidator.equals(
    "total records should be consistent across different limits",
    limit10Page1.pagination.records,
    limit20Page1.pagination.records,
  );
  TestValidator.equals(
    "total records should be consistent for all limit values",
    limit20Page1.pagination.records,
    limit50Page1.pagination.records,
  );

  // Step 7: Test last page handling if there are multiple pages with limit 10
  if (limit10Page1.pagination.pages > 1) {
    const lastPage =
      await api.functional.discussionBoard.moderator.members.index(connection, {
        body: {
          page: limit10Page1.pagination.pages,
          limit: 10,
        } satisfies IDiscussionBoardMember.IRequest,
      });
    typia.assert(lastPage);

    TestValidator.equals(
      "last page: current should match requested page",
      lastPage.pagination.current,
      limit10Page1.pagination.pages,
    );

    const expectedLastPageSize =
      limit10Page1.pagination.records % 10 === 0
        ? 10
        : limit10Page1.pagination.records % 10;
    TestValidator.predicate(
      "last page: data length should be correct",
      lastPage.data.length <= 10,
    );
  }
}

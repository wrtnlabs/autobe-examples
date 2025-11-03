import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member search pagination controls and sorting options.
 *
 * This test validates that the member directory supports configurable page
 * sizes, accurate page navigation with correct metadata, and multiple sorting
 * options.
 *
 * Test workflow:
 *
 * 1. Create 55 member accounts to populate the directory for pagination testing
 * 2. Test pagination with different page sizes (10, 20, 50)
 * 3. Verify pagination metadata (current page, limit, records, pages)
 * 4. Test sorting by created_at (newest first)
 * 5. Test sorting by username (alphabetical)
 * 6. Test sorting by display_name (alphabetical)
 * 7. Validate that pagination and sorting work correctly together
 */
export async function test_api_member_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Create 55 members to ensure multiple pages for all page sizes
  const members = await ArrayUtil.asyncRepeat(55, async (index) => {
    const member = await api.functional.discussionBoard.members.create(
      connection,
      {
        body: {
          username: `testuser${index}_${RandomGenerator.alphaNumeric(6)}`,
          email: typia.random<string & tags.Format<"email">>(),
          password: "TestPassword123!",
          display_name: `Test User ${index}`,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardMember.ICreate,
      },
    );
    typia.assert(member);
    return member;
  });

  // Test pagination with page size 10
  const page10_1 = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page10_1);
  TestValidator.equals(
    "page 1 limit 10 - current page",
    page10_1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 - limit",
    page10_1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 limit 10 - has records",
    page10_1.pagination.records >= 55,
  );
  TestValidator.predicate(
    "page 1 limit 10 - has pages",
    page10_1.pagination.pages >= 6,
  );
  TestValidator.equals(
    "page 1 limit 10 - data length",
    page10_1.data.length,
    10,
  );

  // Test pagination with page size 20
  const page20_1 = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page20_1);
  TestValidator.equals(
    "page 1 limit 20 - current page",
    page20_1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 20 - limit",
    page20_1.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "page 1 limit 20 - has records",
    page20_1.pagination.records >= 55,
  );
  TestValidator.predicate(
    "page 1 limit 20 - has pages",
    page20_1.pagination.pages >= 3,
  );
  TestValidator.equals(
    "page 1 limit 20 - data length",
    page20_1.data.length,
    20,
  );

  // Test pagination with page size 50
  const page50_1 = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page50_1);
  TestValidator.equals(
    "page 1 limit 50 - current page",
    page50_1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 50 - limit",
    page50_1.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "page 1 limit 50 - has records",
    page50_1.pagination.records >= 55,
  );
  TestValidator.predicate(
    "page 1 limit 50 - has pages",
    page50_1.pagination.pages >= 2,
  );
  TestValidator.equals(
    "page 1 limit 50 - data length",
    page50_1.data.length,
    50,
  );

  // Test second page with limit 20
  const page20_2 = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 2,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page20_2);
  TestValidator.equals(
    "page 2 limit 20 - current page",
    page20_2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 20 - limit",
    page20_2.pagination.limit,
    20,
  );
  TestValidator.equals(
    "page 2 limit 20 - data length",
    page20_2.data.length,
    20,
  );

  // Test sorting by created_at DESC (newest first - default)
  const sortedByCreatedDesc =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(sortedByCreatedDesc);
  TestValidator.predicate(
    "sorted by created_at desc - has data",
    sortedByCreatedDesc.data.length > 0,
  );

  // Test sorting by username ASC (alphabetical)
  const sortedByUsernameAsc =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "username",
        sort_order: "asc",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(sortedByUsernameAsc);
  TestValidator.predicate(
    "sorted by username asc - has data",
    sortedByUsernameAsc.data.length > 0,
  );

  // Verify username sorting is alphabetical
  for (let i = 1; i < sortedByUsernameAsc.data.length; i++) {
    const prev = sortedByUsernameAsc.data[i - 1];
    const curr = sortedByUsernameAsc.data[i];
    TestValidator.predicate(
      `username sorting - ${prev.username} <= ${curr.username}`,
      prev.username <= curr.username,
    );
  }

  // Test sorting by display_name ASC
  const sortedByDisplayNameAsc =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "display_name",
        sort_order: "asc",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(sortedByDisplayNameAsc);
  TestValidator.predicate(
    "sorted by display_name asc - has data",
    sortedByDisplayNameAsc.data.length > 0,
  );

  // Verify display_name sorting is alphabetical
  for (let i = 1; i < sortedByDisplayNameAsc.data.length; i++) {
    const prev = sortedByDisplayNameAsc.data[i - 1];
    const curr = sortedByDisplayNameAsc.data[i];
    const prevName = prev.display_name ?? prev.username;
    const currName = curr.display_name ?? curr.username;
    TestValidator.predicate(
      `display_name sorting - ${prevName} <= ${currName}`,
      prevName <= currName,
    );
  }

  // Test pagination with page size 100
  const page100_1 = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page100_1);
  TestValidator.equals(
    "page 1 limit 100 - current page",
    page100_1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 100 - limit",
    page100_1.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "page 1 limit 100 - has all records",
    page100_1.data.length >= 55,
  );
}

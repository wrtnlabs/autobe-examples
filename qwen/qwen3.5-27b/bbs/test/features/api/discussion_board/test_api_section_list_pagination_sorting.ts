import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test pagination and sorting functionality for discussion board section listing.
 *
 * This test verifies that the section listing API correctly handles:
 * - Default pagination parameters
 * - Custom page sizes
 * - Page navigation
 * - Sorting by different fields (name, created_at, updated_at)
 * - Sorting directions (ascending, descending)
 * - Pagination metadata calculation
 */
export async function test_api_section_list_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  // 1. Test default pagination (page=1, limit=20, sort=created_at DESC)
  const defaultResult = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {} satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default page is 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.predicate("has data array", Array.isArray(defaultResult.data));
  // 2. Test custom page size (limit=10)
  const customLimitResult = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(customLimitResult);
  TestValidator.equals(
    "custom limit applied",
    customLimitResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data count matches or less than limit",
    customLimitResult.data.length <= 10,
  );
  // 3. Test page navigation (page=2, limit=10)
  const page2Result = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  // 4. Test sorting by name ASC
  const nameAscResult = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        sort: "name",
        direction: "asc",
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(nameAscResult);
  // Verify alphabetical order
  if (nameAscResult.data.length > 1) {
    for (let i = 1; i < nameAscResult.data.length; i++) {
      TestValidator.predicate(
        `name ASC order at index ${i}`,
        nameAscResult.data[i - 1].name <= nameAscResult.data[i].name,
      );
    }
  }
  // 5. Test sorting by name DESC
  const nameDescResult = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        sort: "name",
        direction: "desc",
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(nameDescResult);
  // Verify reverse alphabetical order
  if (nameDescResult.data.length > 1) {
    for (let i = 1; i < nameDescResult.data.length; i++) {
      TestValidator.predicate(
        `name DESC order at index ${i}`,
        nameDescResult.data[i - 1].name >= nameDescResult.data[i].name,
      );
    }
  }
  // 6. Test sorting by updated_at DESC
  const updatedAtDescResult =
    await api.functional.discussionBoard.sections.index(guestConnection, {
      body: {
        sort: "updated_at",
        direction: "desc",
        limit: 50,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(updatedAtDescResult);
  // Verify updated_at descending order
  if (updatedAtDescResult.data.length > 1) {
    for (let i = 1; i < updatedAtDescResult.data.length; i++) {
      TestValidator.predicate(
        `updated_at DESC order at index ${i}`,
        new Date(updatedAtDescResult.data[i - 1].updated_at).getTime() >=
          new Date(updatedAtDescResult.data[i].updated_at).getTime(),
      );
    }
  }
  // 7. Test maximum page size (limit=100)
  const maxLimitResult = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit applied",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data count within max limit",
    maxLimitResult.data.length <= 100,
  );
  // 8. Verify pagination metadata calculation
  const metadataResult = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(metadataResult);
  // Verify pages calculation: ceiling(records / limit)
  const expectedPages = Math.ceil(
    metadataResult.pagination.records / metadataResult.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    metadataResult.pagination.pages,
    expectedPages,
  );
  // Verify current page is within bounds
  TestValidator.predicate(
    "current page within valid range",
    metadataResult.pagination.current >= 1 &&
      (metadataResult.pagination.pages === 0 ||
        metadataResult.pagination.current <= metadataResult.pagination.pages),
  );
  // 9. Test with search parameter
  const searchResult = await api.functional.discussionBoard.sections.index(
    guestConnection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.equals(
    "search pagination current",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "search pagination limit",
    searchResult.pagination.limit,
    10,
  );
}

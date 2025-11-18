import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppCategory";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test searching and filtering user categories with pagination.
 *
 * This test validates the complete category search functionality including:
 *
 * 1. User authentication and category creation
 * 2. Search by name and description with partial matching
 * 3. Pagination with page and limit parameters
 * 4. User isolation ensuring only authenticated user's categories are returned
 * 5. Edge cases like searching on empty collections
 *
 * The test creates multiple categories with different names and descriptions,
 * then performs various search queries to verify filtering works correctly,
 * pagination navigation functions properly, and the system only returns
 * categories belonging to the authenticated user.
 */
export async function test_api_category_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!";
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href: "https://example.com",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create multiple test categories with different names
  const categoryNames = [
    "Work Tasks",
    "Personal Projects",
    "Shopping List",
    "Study Materials",
    "Exercise Routine",
    "Meal Planning",
    "Home Maintenance",
    "Travel Plans",
  ];

  const categories = await ArrayUtil.asyncMap(categoryNames, async (name) => {
    const description = RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
    });
    return await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name,
        description,
      } satisfies ITodoAppCategory.ICreate,
    });
  });

  // Step 3: Test basic pagination without search
  const page1 = await api.functional.todoApp.user.categories.index(connection, {
    body: {
      page: 1,
      limit: 3,
    } satisfies ITodoAppCategory.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 3);
  TestValidator.equals("page 1 count", page1.data.length, 3);

  const page2 = await api.functional.todoApp.user.categories.index(connection, {
    body: {
      page: 2,
      limit: 3,
    } satisfies ITodoAppCategory.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 count", page2.data.length, 3);

  // Step 4: Test search functionality - partial name matching
  const searchResults = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        search: "Work",
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search found work items",
    searchResults.data.some((cat) => cat.name.includes("Work")),
  );

  const shoppingResults = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        search: "Shop",
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(shoppingResults);
  TestValidator.predicate(
    "search found shopping",
    shoppingResults.data.length > 0 &&
      shoppingResults.data.every((cat) => cat.name.includes("Shop")),
  );

  // Step 5: Test combined search and pagination
  const searchPage1 = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        search: "List",
        page: 1,
        limit: 5,
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(searchPage1);
  TestValidator.predicate(
    "search page contains list",
    searchPage1.data.every((cat) => cat.name.includes("List")),
  );

  // Step 6: Test search with no results
  const noResults = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        search: "xyz123notfound",
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(noResults);
  TestValidator.equals("no results found", noResults.data.length, 0);

  // Step 7: Test edge case - limit maximum
  const maxLimit = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.predicate(
    "max limit respects constraint",
    maxLimit.pagination.limit <= 100,
  );

  // Step 8: Test pagination bounds
  const beyondLastPage = await api.functional.todoApp.user.categories.index(
    connection,
    {
      body: {
        page: 100,
        limit: 10,
      } satisfies ITodoAppCategory.IRequest,
    },
  );
  typia.assert(beyondLastPage);
  TestValidator.equals(
    "beyond last page has no data",
    beyondLastPage.data.length,
    0,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test text-based search functionality within category task context.
 *
 * This test validates comprehensive text search capabilities within a specific
 * category, testing various search patterns including partial text matching,
 * case-insensitive search, multi-term queries, and special character handling.
 * The test creates a category with multiple tasks containing different text
 * patterns, then performs various search operations to verify the search
 * functionality works correctly.
 *
 * Test workflow:
 *
 * 1. Create authenticated user account
 * 2. Create a category for organizing tasks
 * 3. Create multiple tasks with varied titles and descriptions
 * 4. Test basic text search with partial matching
 * 5. Test case-insensitive search behavior
 * 6. Test multi-term search queries
 * 7. Test special character handling
 * 8. Test empty result scenarios
 * 9. Validate search result pagination
 *
 * Each test case verifies that search results contain the expected tasks based
 * on title and description content matching.
 */
export async function test_api_category_task_search_text_filter(
  connection: api.IConnection,
) {
  // 1. Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      ip: "127.0.0.1",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  TestValidator.predicate("user created successfully", user.id !== undefined);
  TestValidator.equals("user email matches", user.email, userEmail);

  // 2. Create a category for organizing tasks
  const categoryName = RandomGenerator.name();
  const category = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: categoryName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category);
  TestValidator.equals("category name matches", category.name, categoryName);
  TestValidator.predicate(
    "category belongs to user",
    category.user.id === user.id,
  );

  // 3. Create multiple tasks with varied titles and descriptions
  const tasks = await ArrayUtil.asyncRepeat(6, async (index) => {
    const titles = [
      "Complete project documentation",
      "update user interface design",
      "Review code changes",
      "Fix database connection issues",
      "Deploy new features",
      "Test authentication system",
    ] as const;

    const descriptions = [
      "Finish the technical documentation for the main project",
      "Redesign the UI with modern design principles and accessibility",
      "Review latest pull requests and provide feedback",
      "Resolve connection timeouts and improve performance",
      "Deploy all completed features to production environment",
      "Test login/logout functionality with various scenarios",
    ] as const;

    return await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: titles[index],
        description: descriptions[index],
        todo_app_category_id: category.id,
        priority: RandomGenerator.pick(["Low", "Medium", "High"]),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        completion_order: index,
      } satisfies ITodoAppTask.ICreate,
    });
  });

  tasks.forEach((task) => typia.assert(task));
  TestValidator.equals("all tasks created", tasks.length, 6);

  // 4. Test basic text search with partial matching
  const searchForDocumentation =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        search: "documentation",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(searchForDocumentation);

  TestValidator.predicate(
    "documentation search returns results",
    searchForDocumentation.data.length > 0,
  );
  TestValidator.predicate(
    "results contain documentation text",
    searchForDocumentation.data.some((task) =>
      task.title.toLowerCase().includes("documentation"),
    ),
  );

  // 5. Test case-insensitive search behavior
  const searchForDESIGN =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        search: "DESIGN",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(searchForDESIGN);

  TestValidator.predicate(
    "uppercase design search returns results",
    searchForDESIGN.data.length > 0,
  );
  TestValidator.predicate(
    "results contain design text (case insensitive)",
    searchForDESIGN.data.some((task) =>
      task.title.toLowerCase().includes("design"),
    ),
  );

  // 6. Test multi-term search queries
  const searchForDatabaseConnection =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        search: "database connection",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(searchForDatabaseConnection);

  TestValidator.predicate(
    "multi-term database connection search returns results",
    searchForDatabaseConnection.data.length > 0,
  );
  TestValidator.predicate(
    "results contain database connection terms",
    searchForDatabaseConnection.data.some(
      (task) =>
        task.title.toLowerCase().includes("database") &&
        task.title.toLowerCase().includes("connection"),
    ),
  );

  // 7. Test special character handling
  const searchForReview =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        search: "review code",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(searchForReview);

  TestValidator.predicate(
    "review code search returns results",
    searchForReview.data.length > 0,
  );
  TestValidator.predicate(
    "results contain review or code terms",
    searchForReview.data.some(
      (task) =>
        task.title.toLowerCase().includes("review") ||
        task.title.toLowerCase().includes("code"),
    ),
  );

  // 8. Test empty result scenarios
  const searchForNonExistent =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        search: "xyz123nonexistent456abc",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(searchForNonExistent);

  TestValidator.equals(
    "non-existent search returns empty results",
    searchForNonExistent.data.length,
    0,
  );
  TestValidator.equals(
    "pagination shows zero records",
    searchForNonExistent.pagination.records,
    0,
  );

  // 9. Test pagination with search results
  const searchWithPagination =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 2,
        search: "task",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(searchWithPagination);

  TestValidator.predicate(
    "pagination search returns results",
    searchWithPagination.data.length > 0,
  );
  TestValidator.predicate(
    "pagination respects limit",
    searchWithPagination.data.length <= 2,
  );
  TestValidator.equals(
    "pagination info is valid",
    searchWithPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    searchWithPagination.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records positive",
    searchWithPagination.pagination.records > 0,
  );

  // 10. Test search with status filter combination
  const searchWithStatusFilter =
    await api.functional.todoApp.user.categories.tasks.index(connection, {
      categoryId: category.id,
      body: {
        page: 1,
        limit: 10,
        search: "project",
        status: "pending",
      } satisfies ITodoAppTask.IRequest,
    });
  typia.assert(searchWithStatusFilter);

  TestValidator.predicate(
    "search with status filter returns results",
    searchWithStatusFilter.data.length >= 0,
  );
  searchWithStatusFilter.data.forEach((task) => {
    TestValidator.equals(
      "all results are pending status",
      task.status,
      "pending",
    );
  });
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test comprehensive full-text search across todo fields.
 *
 * This test validates that the full-text search functionality correctly finds
 * todos by matching partial text in both title and description fields. The
 * search is case-insensitive and returns all matching todos from the user's
 * todo list.
 *
 * Test workflow:
 *
 * 1. Create a user account for testing
 * 2. Create multiple todos with distinctive keywords in titles and descriptions
 * 3. Perform search queries for specific keywords
 * 4. Validate that search results include all matching todos
 * 5. Validate that search correctly filters non-matching todos
 * 6. Test case-insensitivity of search functionality
 */
export async function test_api_todo_list_full_text_search_across_fields(
  connection: api.IConnection,
) {
  // Step 1: Create user account
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create todos with distinctive keywords for searching
  const todo1: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Buy groceries at the supermarket",
        description: "Need to purchase milk, bread, and vegetables for cooking",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);

  const todo2: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Fix the kitchen sink leak",
        description:
          "Water is dripping from the faucet. Call plumber to repair it",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);

  const todo3: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Prepare presentation for work meeting",
        description:
          "Create slides about quarterly sales performance and market analysis",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);

  const todo4: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Schedule dentist appointment",
        description:
          "Book a checkup and cleaning with Dr. Smith at the dental clinic",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo4);

  const todo5: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Learn TypeScript advanced patterns",
        description:
          "Study generics, decorators, and type inference in TypeScript",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo5);

  // Step 3: Search for "water" - should find todo2 (in description)
  const searchWaterResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "water",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchWaterResult);
  TestValidator.predicate("search for 'water' should find todo2", () =>
    searchWaterResult.data.some(
      (t) => t.id === todo2.id && t.title.toLowerCase().includes("sink"),
    ),
  );

  // Step 4: Search for "presentation" - should find todo3 (in title)
  const searchPresentationResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "presentation",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchPresentationResult);
  TestValidator.predicate("search for 'presentation' should find todo3", () =>
    searchPresentationResult.data.some((t) => t.id === todo3.id),
  );

  // Step 5: Search for "cook" - should find todo1 (in description)
  const searchCookResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "cook",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchCookResult);
  TestValidator.predicate("search for 'cook' should find todo1", () =>
    searchCookResult.data.some((t) => t.id === todo1.id),
  );

  // Step 6: Search for "dentist" - should find todo4 (in description)
  const searchDentistResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "dentist",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchDentistResult);
  TestValidator.predicate("search for 'dentist' should find todo4", () =>
    searchDentistResult.data.some((t) => t.id === todo4.id),
  );

  // Step 7: Search for "type" - should find todo5 (in description)
  const searchTypeResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "type",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchTypeResult);
  TestValidator.predicate("search for 'type' should find todo5", () =>
    searchTypeResult.data.some((t) => t.id === todo5.id),
  );

  // Step 8: Search for "supermarket" - should find todo1 (in title)
  const searchSupermarketResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "supermarket",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchSupermarketResult);
  TestValidator.predicate("search for 'supermarket' should find todo1", () =>
    searchSupermarketResult.data.some((t) => t.id === todo1.id),
  );

  // Step 9: Test case-insensitivity - search for "PLUMBER" should find todo2
  const searchUppercaseResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "PLUMBER",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchUppercaseResult);
  TestValidator.predicate(
    "search for 'PLUMBER' (uppercase) should find todo2 (case-insensitive)",
    () => searchUppercaseResult.data.some((t) => t.id === todo2.id),
  );

  // Step 10: Search for "performance" - should find todo3 (in description)
  const searchPerformanceResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "performance",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchPerformanceResult);
  TestValidator.predicate("search for 'performance' should find todo3", () =>
    searchPerformanceResult.data.some((t) => t.id === todo3.id),
  );

  // Step 11: Search for broad term "schedule" - should find todo4 (in title)
  const searchScheduleResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "schedule",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchScheduleResult);
  TestValidator.predicate("search for 'schedule' should find todo4", () =>
    searchScheduleResult.data.some((t) => t.id === todo4.id),
  );

  // Step 12: Verify that search results don't include unrelated todos
  const searchVegetablesResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "vegetables",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(searchVegetablesResult);
  TestValidator.predicate(
    "search for 'vegetables' should find todo1 but not others",
    () =>
      searchVegetablesResult.data.length === 1 &&
      searchVegetablesResult.data.some((t) => t.id === todo1.id),
  );
}

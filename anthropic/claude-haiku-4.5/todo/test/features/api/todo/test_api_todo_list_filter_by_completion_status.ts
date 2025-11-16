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
 * Test filtering todo items by completion status.
 *
 * This test validates that the completion status filter (is_completed)
 * correctly filters todos based on their completion state. The test
 * demonstrates that the is_completed filter parameter works as expected:
 *
 * Workflow:
 *
 * 1. Create and authenticate a new user account
 * 2. Create multiple test todos (which are created as incomplete by default)
 * 3. Filter todos using is_completed: false to retrieve all created incomplete
 *    todos
 * 4. Filter todos using is_completed: true to verify no completed todos exist
 * 5. Validate filter results and pagination structure
 * 6. Verify that filters return correct subsets based on completion status
 */
export async function test_api_todo_list_filter_by_completion_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);
  const userAccount: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "http://localhost:3000/auth/join",
        referrer: "http://localhost:3000",
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(userAccount);
  TestValidator.predicate(
    "user account created with valid ID",
    userAccount.id !== null && userAccount.id !== undefined,
  );

  // Step 2: Create multiple test todos
  // All created todos are automatically incomplete (is_completed: false)
  const createdTodos: ITodoAppTodo[] = [];
  for (let i = 0; i < 5; i++) {
    const todoTitle = `Test Todo ${i + 1}`;
    const todoItem = await api.functional.todoApp.user.todos.create(
      connection,
      {
        body: {
          title: todoTitle,
          description: `This is a test todo item number ${i + 1}`,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todoItem);
    TestValidator.equals(
      `created todo ${i + 1} is marked as incomplete`,
      todoItem.is_completed,
      false,
    );
    createdTodos.push(todoItem);
  }

  // Step 3: Filter todos by is_completed = false (incomplete todos)
  const incompleteFilterResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        is_completed: false,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(incompleteFilterResult);
  TestValidator.predicate(
    "incomplete filter result contains pagination info",
    incompleteFilterResult.pagination !== null &&
      incompleteFilterResult.pagination !== undefined,
  );

  // Step 4: Validate incomplete todos filter results
  TestValidator.predicate(
    "incomplete filter returns at least the created todos",
    incompleteFilterResult.data.length >= createdTodos.length,
  );

  // Verify all returned todos have is_completed = false
  for (const todo of incompleteFilterResult.data) {
    TestValidator.equals(
      "filtered incomplete todo has is_completed set to false",
      todo.is_completed,
      false,
    );
  }

  // Step 5: Filter todos by is_completed = true (completed todos)
  const completedFilterResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        is_completed: true,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(completedFilterResult);
  TestValidator.predicate(
    "completed filter result contains pagination info",
    completedFilterResult.pagination !== null &&
      completedFilterResult.pagination !== undefined,
  );

  // Verify all returned todos (if any) have is_completed = true
  for (const todo of completedFilterResult.data) {
    TestValidator.equals(
      "filtered completed todo has is_completed set to true",
      todo.is_completed,
      true,
    );
  }

  // Step 6: Validate filter separation effectiveness
  TestValidator.predicate(
    "completed filter returns no results since no todos are marked complete",
    completedFilterResult.data.length === 0,
  );

  TestValidator.predicate(
    "incomplete filter returns created todos",
    incompleteFilterResult.data.some((todo) =>
      createdTodos.some((created) => created.id === todo.id),
    ),
  );

  // Step 7: Validate pagination structure for both filters
  TestValidator.predicate(
    "incomplete filter pagination has valid current page",
    incompleteFilterResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "incomplete filter pagination has positive limit",
    incompleteFilterResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "incomplete filter pagination has non-negative records count",
    incompleteFilterResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "incomplete filter pagination has non-negative pages count",
    incompleteFilterResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "completed filter pagination has valid current page",
    completedFilterResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "completed filter pagination has positive limit",
    completedFilterResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "completed filter pagination has non-negative records count",
    completedFilterResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "completed filter pagination has non-negative pages count",
    completedFilterResult.pagination.pages >= 0,
  );
}

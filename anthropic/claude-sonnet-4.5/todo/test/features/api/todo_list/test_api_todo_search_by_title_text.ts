import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates title text search functionality for todo items.
 *
 * This test verifies that users can efficiently search and filter their todo
 * items by searching within title content using partial text matches. The test
 * validates the GIN index-powered text search capability on the title field.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a test user account
 * 2. Create multiple todo items with distinct, searchable titles
 * 3. Perform text searches using partial title keywords
 * 4. Validate that matching todos are returned
 * 5. Confirm non-matching todos are excluded
 * 6. Verify case-insensitive search behavior
 */
export async function test_api_todo_search_by_title_text(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a test user
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.IRegister;

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: registrationData },
  );
  typia.assert(user);

  // Step 2: Create multiple todo items with distinct searchable titles
  const shoppingTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Buy groceries and shopping supplies",
        description: "Get milk, eggs, and bread from store",
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(shoppingTodo);

  const workTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Complete project report for work",
        description: "Finish quarterly analysis",
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(workTodo);

  const exerciseTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Morning exercise routine",
        description: "Yoga and running",
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(exerciseTodo);

  const meetingTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Schedule team meeting",
        description: "Coordinate with project stakeholders",
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(meetingTodo);

  // Step 3: Search for todos containing "shopping" in title
  const shoppingSearchResults: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        search: "shopping",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(shoppingSearchResults);

  // Step 4: Validate that shopping todo is in results
  TestValidator.predicate(
    "shopping search should return at least one result",
    shoppingSearchResults.data.length > 0,
  );

  const foundShoppingTodo = shoppingSearchResults.data.find(
    (todo) => todo.id === shoppingTodo.id,
  );

  TestValidator.predicate(
    "shopping todo should exist in search results",
    foundShoppingTodo !== undefined,
  );

  typia.assertGuard(foundShoppingTodo!);

  TestValidator.equals(
    "shopping todo title should match",
    foundShoppingTodo.title,
    shoppingTodo.title,
  );

  // Step 5: Search for todos containing "project" in title
  const projectSearchResults: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        search: "project",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(projectSearchResults);

  TestValidator.predicate(
    "project search should return results",
    projectSearchResults.data.length > 0,
  );

  const foundWorkTodo = projectSearchResults.data.find(
    (todo) => todo.id === workTodo.id,
  );

  TestValidator.predicate(
    "work todo should exist in project search results",
    foundWorkTodo !== undefined,
  );

  typia.assertGuard(foundWorkTodo!);

  TestValidator.equals(
    "work todo title should match",
    foundWorkTodo.title,
    workTodo.title,
  );

  // Step 6: Verify non-matching todos are excluded
  const exerciseInProjectResults = projectSearchResults.data.find(
    (todo) => todo.id === exerciseTodo.id,
  );

  TestValidator.predicate(
    "exercise todo should not appear in project search",
    exerciseInProjectResults === undefined,
  );

  // Step 7: Test case-insensitive search with uppercase
  const uppercaseSearchResults: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        search: "MEETING",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(uppercaseSearchResults);

  const foundMeetingTodo = uppercaseSearchResults.data.find(
    (todo) => todo.id === meetingTodo.id,
  );

  TestValidator.predicate(
    "meeting todo should exist in case-insensitive search results",
    foundMeetingTodo !== undefined,
  );

  typia.assertGuard(foundMeetingTodo!);

  TestValidator.equals(
    "meeting todo title should match in case-insensitive search",
    foundMeetingTodo.title,
    meetingTodo.title,
  );

  // Step 8: Test partial word search
  const partialSearchResults: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        search: "exerc",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(partialSearchResults);

  const foundExerciseTodo = partialSearchResults.data.find(
    (todo) => todo.id === exerciseTodo.id,
  );

  TestValidator.predicate(
    "exercise todo should exist in partial search results",
    foundExerciseTodo !== undefined,
  );

  typia.assertGuard(foundExerciseTodo!);

  TestValidator.equals(
    "exercise todo title should match in partial search",
    foundExerciseTodo.title,
    exerciseTodo.title,
  );
}

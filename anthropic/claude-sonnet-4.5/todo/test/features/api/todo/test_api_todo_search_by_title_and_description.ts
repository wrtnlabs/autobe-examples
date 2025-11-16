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
 * Test the search functionality that allows users to find todos by typing
 * keywords that match title or description fields with case-insensitive partial
 * matching.
 *
 * This test validates:
 *
 * 1. Search matches keywords in titles
 * 2. Search matches keywords in descriptions
 * 3. Search matches keywords in both title and description
 * 4. Search is case-insensitive
 * 5. Search uses partial matching
 * 6. Empty search returns all user todos
 *
 * Test workflow:
 *
 * 1. Authenticate a user
 * 2. Create multiple todos with diverse titles and descriptions
 * 3. Test search by title keywords
 * 4. Test search by description keywords
 * 5. Test search by keywords appearing in both
 * 6. Validate case-insensitive matching
 */
export async function test_api_todo_search_by_title_and_description(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "testPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create todos with diverse titles and descriptions for comprehensive testing
  const todo1: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Team Meeting",
        description: "Discuss project updates and next steps",
        status: "pending",
        priority: "high",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo1);

  const todo2: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Prepare meeting notes",
        description: "Review last week's discussion points",
        status: "pending",
        priority: "medium",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo2);

  const todo3: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Buy groceries",
        description: "Get items for the meeting refreshments",
        status: "pending",
        priority: "low",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo3);

  const todo4: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Submit report",
        description: "Complete quarterly financial analysis",
        status: "pending",
        priority: "high",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo4);

  const todo5: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Review code changes",
        description: "Check pull requests from the team",
        status: "in_progress",
        priority: "medium",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo5);

  // Step 3: Test search by title keyword "meeting"
  const searchByTitle: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        search: "meeting",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(searchByTitle);

  // Validate that todos with "meeting" in title or description are found
  TestValidator.predicate(
    "search for 'meeting' should return at least 3 todos",
    searchByTitle.data.length >= 3,
  );

  // Check that todo1 (Team Meeting) is in results
  const hasTodo1 = searchByTitle.data.some((t) => t.id === todo1.id);
  TestValidator.predicate(
    "search should include 'Team Meeting' todo",
    hasTodo1,
  );

  // Check that todo2 (Prepare meeting notes) is in results
  const hasTodo2 = searchByTitle.data.some((t) => t.id === todo2.id);
  TestValidator.predicate(
    "search should include 'Prepare meeting notes' todo",
    hasTodo2,
  );

  // Check that todo3 (meeting in description) is in results
  const hasTodo3 = searchByTitle.data.some((t) => t.id === todo3.id);
  TestValidator.predicate(
    "search should include todo with 'meeting' in description",
    hasTodo3,
  );

  // Step 4: Test search by description keyword "report"
  const searchByDescription: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        search: "report",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(searchByDescription);

  // Validate that todo4 is found
  const hasTodo4 = searchByDescription.data.some((t) => t.id === todo4.id);
  TestValidator.predicate(
    "search for 'report' should include 'Submit report' todo",
    hasTodo4,
  );

  // Step 5: Test search by keyword in both title and description
  const searchTeam: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        search: "team",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(searchTeam);

  // Should find todo1 (Team Meeting) and todo5 (team in description)
  const hasTeamInTitle = searchTeam.data.some((t) => t.id === todo1.id);
  const hasTeamInDescription = searchTeam.data.some((t) => t.id === todo5.id);
  TestValidator.predicate(
    "search for 'team' should find todos with keyword in title",
    hasTeamInTitle,
  );
  TestValidator.predicate(
    "search for 'team' should find todos with keyword in description",
    hasTeamInDescription,
  );

  // Step 6: Test case-insensitive search
  const searchUpperCase: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        search: "MEETING",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(searchUpperCase);

  TestValidator.predicate(
    "case-insensitive search should return same results",
    searchUpperCase.data.length === searchByTitle.data.length,
  );

  // Step 7: Test empty search returns all user todos
  const emptySearch: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {} satisfies ITodoListTodo.IRequest,
    });
  typia.assert(emptySearch);

  TestValidator.predicate(
    "empty search should return all user todos",
    emptySearch.data.length >= 5,
  );
}

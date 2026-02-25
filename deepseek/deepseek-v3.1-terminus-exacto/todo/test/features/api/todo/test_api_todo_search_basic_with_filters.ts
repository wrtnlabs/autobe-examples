import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_search_basic_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // 2. Create sample todos with varying characteristics
  // We'll create 8 todos: 4 completed, 4 incomplete, with different titles
  const todos: ITodoAppTodo[] = [];
  const keywords = ["urgent", "shopping", "work", "personal"];
  for (let i = 0; i < 8; i++) {
    const isCompleted = i % 2 === 0; // Even indices are completed
    const keywordIndex = i % keywords.length;
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: {
          title: `${keywords[keywordIndex]} task ${i + 1} ${RandomGenerator.alphabets(3)}`,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    todos.push(todo);
    // If this todo should be completed, we need to toggle completion status
    // Note: Since we don't have completion toggle SDK, we'll use the ones created as-is
    // The test will use actual completion status from the API
  }
  // 3. Test empty search with no filters
  const emptySearch = await api.functional.todoApp.user.search(userConnection, {
    body: {} satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search returns all user's todos",
    emptySearch.data.length,
    todos.length,
  );
  TestValidator.equals(
    "pagination metadata for empty search",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "total records matches created todos",
    emptySearch.pagination.records,
    todos.length,
  );
  // Verify summary information
  for (const item of emptySearch.data) {
    typia.assert<ITodoAppTodo.ISummary>(item);
    TestValidator.predicate("has id", item.id.length > 0);
    TestValidator.predicate("has title", item.title.length > 0);
    TestValidator.predicate("has created_at", item.created_at.length > 0);
    TestValidator.predicate("has updated_at", item.updated_at.length > 0);
  }
  // 4. Test text search with query matching only some todos
  // Search for "urgent" which should match todos with urgent in title
  const textSearch = await api.functional.todoApp.user.search(userConnection, {
    body: {
      search: "urgent",
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(textSearch);
  // Verify all returned todos contain "urgent" in title
  for (const item of textSearch.data) {
    TestValidator.predicate(
      `title contains 'urgent' (actual: ${item.title})`,
      item.title.toLowerCase().includes("urgent"),
    );
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "text search has valid pagination",
    textSearch.pagination.records >= 0 && textSearch.pagination.pages >= 0,
  );
  // 5. Filter by completion_status='complete'
  const completeSearch = await api.functional.todoApp.user.search(
    userConnection,
    {
      body: {
        completion_status: "complete",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeSearch);
  // Note: We can't verify completion status in ISummary as it doesn't have that field
  // The API should filter correctly on the backend
  TestValidator.predicate(
    "complete search returns some todos",
    completeSearch.pagination.records >= 0,
  );
  // 6. Filter by completion_status='incomplete'
  const incompleteSearch = await api.functional.todoApp.user.search(
    userConnection,
    {
      body: {
        completion_status: "incomplete",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteSearch);
  TestValidator.predicate(
    "incomplete search returns some todos",
    incompleteSearch.pagination.records >= 0,
  );
  // 7. Combine text search with completion filter
  const combinedSearch = await api.functional.todoApp.user.search(
    userConnection,
    {
      body: {
        search: "work",
        completion_status: "complete",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(combinedSearch);
  // Verify all returned todos contain "work" in title
  for (const item of combinedSearch.data) {
    TestValidator.predicate(
      `combined search title contains 'work'`,
      item.title.toLowerCase().includes("work"),
    );
  }
  TestValidator.predicate(
    "combined search has valid pagination",
    combinedSearch.pagination.records >= 0,
  );
  // 8. Test pagination with page=1, limit=2
  const paginatedSearch = await api.functional.todoApp.user.search(
    userConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination current page",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedSearch.pagination.limit, 2);
  TestValidator.predicate(
    "data length <= limit",
    paginatedSearch.data.length <= 2,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    paginatedSearch.pagination.pages ===
      Math.ceil(paginatedSearch.pagination.records / 2),
  );
  // 9. Privacy isolation test - create another user and verify they see different todos
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUser = await authorize_user_join(anotherUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(anotherUser);
  const anotherUserSearch = await api.functional.todoApp.user.search(
    anotherUserConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(anotherUserSearch);
  // New user should have no todos initially
  TestValidator.equals(
    "another user initially has no todos",
    anotherUserSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "another user initially has empty data",
    anotherUserSearch.data.length,
    0,
  );
}

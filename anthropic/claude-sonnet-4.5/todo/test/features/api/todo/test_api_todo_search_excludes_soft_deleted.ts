import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_search_excludes_soft_deleted(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.IRegister,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple todo items
  const todo1: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Active Todo 1",
        description: "This todo will remain active",
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo1);

  const todo2: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "Active Todo 2",
        description: "This todo will also remain active",
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo2);

  const todo3: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "To Be Deleted Todo 1",
        description: "This todo will be soft deleted",
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo3);

  const todo4: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: "To Be Deleted Todo 2",
        description: "This todo will also be soft deleted",
        status: "complete",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo4);

  // Step 3: Perform initial search to verify all todos are present
  const initialSearchResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "all",
        page: 1,
        limit: 50,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(initialSearchResult);

  TestValidator.equals(
    "initial search should return 4 todos",
    initialSearchResult.data.length,
    4,
  );

  // Step 4: Soft delete some todos
  const deletedTodo1: ITodoListTodo =
    await api.functional.todoList.user.todos.erase(connection, {
      todoId: todo3.id,
    });
  typia.assert(deletedTodo1);

  const deletedTodo2: ITodoListTodo =
    await api.functional.todoList.user.todos.erase(connection, {
      todoId: todo4.id,
    });
  typia.assert(deletedTodo2);

  // Step 5: Verify soft-deleted todos have deleted_at timestamp
  TestValidator.predicate(
    "deleted todo 1 should have deleted_at timestamp",
    deletedTodo1.deleted_at !== null && deletedTodo1.deleted_at !== undefined,
  );

  TestValidator.predicate(
    "deleted todo 2 should have deleted_at timestamp",
    deletedTodo2.deleted_at !== null && deletedTodo2.deleted_at !== undefined,
  );

  // Step 6: Perform search after deletion to verify exclusion
  const afterDeletionSearchResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "all",
        page: 1,
        limit: 50,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(afterDeletionSearchResult);

  // Step 7: Validate that only active todos are returned
  TestValidator.equals(
    "search after deletion should return only 2 active todos",
    afterDeletionSearchResult.data.length,
    2,
  );

  // Step 8: Verify the returned todos are the active ones
  const returnedTodoIds = afterDeletionSearchResult.data.map((todo) => todo.id);

  TestValidator.predicate(
    "active todo 1 should be in search results",
    returnedTodoIds.includes(todo1.id),
  );

  TestValidator.predicate(
    "active todo 2 should be in search results",
    returnedTodoIds.includes(todo2.id),
  );

  TestValidator.predicate(
    "deleted todo 1 should NOT be in search results",
    !returnedTodoIds.includes(todo3.id),
  );

  TestValidator.predicate(
    "deleted todo 2 should NOT be in search results",
    !returnedTodoIds.includes(todo4.id),
  );

  // Step 9: Verify with status-specific searches
  const incompleteSearchResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        status: "incomplete",
        page: 1,
        limit: 50,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(incompleteSearchResult);

  TestValidator.equals(
    "incomplete search should return only active incomplete todos",
    incompleteSearchResult.data.length,
    2,
  );
}

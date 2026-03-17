import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test that members can filter their trash list by completion status.
 *
 * This test verifies the trash filtering functionality by:
 * 1. Creating multiple todos
 * 2. Deleting todos to move them to trash
 * 3. Testing filter options (complete, incomplete, all)
 * 4. Validating that filtering works correctly
 *
 * Note: The current API surface does not expose a completion toggle endpoint
 * in the provided SDK functions. This test validates the filtering mechanism
 * with the available data (all todos are incomplete by default on creation).
 */
export async function test_api_trash_filter_by_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create 6 todos (all will be incomplete by default)
  const todos: ITodoAppTodo[] = [];
  for (let i = 0; i < 6; i++) {
    const todo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Test Todo ${i + 1} - ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
    typia.assert(todo);
    todos.push(todo);
  }
  // 3. Delete all todos to move them to trash
  for (const todo of todos) {
    await api.functional.todoApp.member.todos.erase(memberConnection, {
      todoId: todo.id,
    });
  }
  // 4. Test filter: completed='complete' - should return 0 (no complete todos exist)
  const completeFilterResult =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        completed: "complete",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(completeFilterResult);
  TestValidator.equals(
    "complete filter count",
    completeFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "complete filter data length",
    completeFilterResult.data.length,
    0,
  );
  // 5. Test filter: completed='incomplete' - should return all 6 todos
  const incompleteFilterResult =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: {
        completed: "incomplete",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(incompleteFilterResult);
  TestValidator.equals(
    "incomplete filter count",
    incompleteFilterResult.pagination.records,
    6,
  );
  TestValidator.equals(
    "incomplete filter data length",
    incompleteFilterResult.data.length,
    6,
  );
  for (const todo of incompleteFilterResult.data) {
    TestValidator.predicate(
      "all filtered are incomplete",
      todo.completed === false,
    );
    TestValidator.predicate(
      "is one of the created todos",
      todos.some((t) => t.id === todo.id),
    );
  }
  // 6. Test filter: completed='all' - should return all 6 deleted todos
  const allFilterResult = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        completed: "all",
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allFilterResult);
  TestValidator.equals(
    "all filter count",
    allFilterResult.pagination.records,
    6,
  );
  TestValidator.equals(
    "all filter data length",
    allFilterResult.data.length,
    6,
  );
  // 7. Test no filter (default) - should also return all 6 deleted todos
  const noFilterResult = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(noFilterResult);
  TestValidator.equals("no filter count", noFilterResult.pagination.records, 6);
  TestValidator.equals("no filter data length", noFilterResult.data.length, 6);
  // 8. Verify data isolation - all todos belong to the authenticated member
  for (const todo of allFilterResult.data) {
    TestValidator.equals("todo owner matches", todo.member.id, auth.id);
  }
  // 9. Verify pagination metadata consistency
  TestValidator.equals(
    "pagination current page",
    allFilterResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    allFilterResult.pagination.limit > 0,
  );
  TestValidator.equals("pagination pages", allFilterResult.pagination.pages, 1);
}

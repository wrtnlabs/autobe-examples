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

export async function test_api_todo_list_filter_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple incomplete todos (newly created todos are incomplete by default)
  const createdTodos = await ArrayUtil.asyncRepeat(5, async () => {
    const todo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {},
    );
    typia.assert(todo);
    return todo;
  });
  // 3. Test filter 'incomplete' - should return all created todos
  const incompleteResponse = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "incomplete",
        deleted: "active",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteResponse);
  // Verify all incomplete todos are returned
  const incompleteTodoIds = incompleteResponse.data.map((t) => t.id);
  const createdTodoIds = createdTodos.map((t) => t.id);
  TestValidator.predicate(
    "all created todos appear in incomplete filter",
    createdTodoIds.every((id) => incompleteTodoIds.includes(id)),
  );
  // Verify all returned todos have completed=false
  TestValidator.predicate(
    "all todos in incomplete filter are incomplete",
    incompleteResponse.data.every((t) => t.completed === false),
  );
  // 4. Test filter 'complete' - should return no todos (all are incomplete)
  const completeResponse = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "complete",
        deleted: "active",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeResponse);
  // Verify no complete todos exist
  TestValidator.predicate(
    "all todos in complete filter are complete",
    completeResponse.data.every((t) => t.completed === true),
  );
  // Verify count matches data length for complete filter
  TestValidator.equals(
    "complete filter count matches data",
    completeResponse.pagination.records,
    completeResponse.data.length,
  );
  // 5. Test filter 'all' - should return all todos
  const allResponse = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "all",
        deleted: "active",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allResponse);
  // Verify all created todos appear in 'all' filter
  const allTodoIds = allResponse.data.map((t) => t.id);
  TestValidator.predicate(
    "all created todos appear in 'all' filter",
    createdTodoIds.every((id) => allTodoIds.includes(id)),
  );
  // Verify count matches data length for 'all' filter
  TestValidator.equals(
    "'all' filter count matches data",
    allResponse.pagination.records,
    allResponse.data.length,
  );
  // 6. Verify incomplete count is at least the number of created todos
  TestValidator.predicate(
    "incomplete filter count includes created todos",
    incompleteResponse.pagination.records >= createdTodos.length,
  );
}

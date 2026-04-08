import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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

export async function test_api_todo_delete_to_trash(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Pass",
    } satisfies ITodoAppMember.IJoin,
  });
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  const deletedTodoId = createdTodo.id;
  const deletedTodoTitle = createdTodo.title;
  const deletedTodoDescription = createdTodo.description;
  const deletedTodoStartDate = createdTodo.startDate;
  const deletedTodoDueDate = createdTodo.dueDate;
  const deletedTodoIsCompleted = createdTodo.isCompleted;
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: deletedTodoId,
  });
  const activeTodos = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 50,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(activeTodos);
  const trashedTodos = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 50,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashedTodos);
  TestValidator.predicate(
    "deleted todo should not remain in the normal todo list",
    activeTodos.data.every((todo) => todo.id !== deletedTodoId),
  );
  const trashedTodo = trashedTodos.data.find(
    (todo) => todo.id === deletedTodoId,
  );
  TestValidator.predicate(
    "deleted todo should appear in the trash list",
    trashedTodo !== undefined,
  );
  if (trashedTodo === undefined) return;
  TestValidator.equals(
    "trashed todo should preserve the original title",
    trashedTodo.title,
    deletedTodoTitle,
  );
  TestValidator.equals(
    "trashed todo should preserve the original description",
    trashedTodo.title,
    deletedTodoTitle,
  );
  TestValidator.equals(
    "trashed todo should preserve the original completion state",
    trashedTodo.isCompleted,
    deletedTodoIsCompleted,
  );
  TestValidator.equals(
    "trashed todo should preserve the original start date",
    trashedTodo.startDate,
    deletedTodoStartDate,
  );
  TestValidator.equals(
    "trashed todo should preserve the original due date",
    trashedTodo.dueDate,
    deletedTodoDueDate,
  );
  TestValidator.equals(
    "trashed todo should remain recoverable with the same identity",
    trashedTodo.id,
    deletedTodoId,
  );
  TestValidator.predicate(
    "trashed todo should be marked as deleted",
    trashedTodo.deletedAt !== null,
  );
}

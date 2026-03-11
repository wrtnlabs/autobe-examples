import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function test_api_trash_listing_with_completion_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated connections for two users
  const userConnection1: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection1, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  const userConnection2: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection2, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  // 2. Create todos for user1 with different completion states
  const todo1 = await api.functional.todoApp.member.todos.create(
    userConnection1,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await api.functional.todoApp.member.todos.create(
    userConnection1,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  const todo3 = await api.functional.todoApp.member.todos.create(
    userConnection1,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo3);
  // 3. Mark todo1 and todo3 as complete, leave todo2 incomplete
  await api.functional.todoApp.member.todos.toggle_complete.toggleComplete(
    userConnection1,
    {
      todoId: todo1.id,
      body: { is_complete: true } satisfies ITodoAppTodo.IToggleComplete,
    },
  );
  await api.functional.todoApp.member.todos.toggle_complete.toggleComplete(
    userConnection1,
    {
      todoId: todo3.id,
      body: { is_complete: true } satisfies ITodoAppTodo.IToggleComplete,
    },
  );
  // 4. Soft delete all todos
  await api.functional.todoApp.member.todos.erase(userConnection1, {
    todoId: todo1.id,
  });
  await api.functional.todoApp.member.todos.erase(userConnection1, {
    todoId: todo2.id,
  });
  await api.functional.todoApp.member.todos.erase(userConnection1, {
    todoId: todo3.id,
  });
  // 5. Test trash listing with 'all' filter (default)
  const allTrash = await api.functional.todoApp.member.trash.index(
    userConnection1,
    {
      body: { status: "all" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allTrash);
  TestValidator.equals("trash count with all filter", allTrash.data.length, 3);
  // 6. Test trash listing with 'complete' filter
  const completeTrash = await api.functional.todoApp.member.trash.index(
    userConnection1,
    {
      body: { status: "complete" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completeTrash);
  TestValidator.equals(
    "trash count with complete filter",
    completeTrash.data.length,
    2,
  );
  // Verify that completed todos are in complete trash
  const completedIds = completeTrash.data.map((t) => t.id);
  TestValidator.predicate(
    "complete trash contains todo1",
    completedIds.includes(todo1.id),
  );
  TestValidator.predicate(
    "complete trash contains todo3",
    completedIds.includes(todo3.id),
  );
  TestValidator.predicate(
    "complete trash does not contain todo2",
    !completedIds.includes(todo2.id),
  );
  TestValidator.predicate(
    "all complete todos are marked complete",
    completeTrash.data.every((todo) => todo.is_complete),
  );
  // 7. Test trash listing with 'incomplete' filter
  const incompleteTrash = await api.functional.todoApp.member.trash.index(
    userConnection1,
    {
      body: { status: "incomplete" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteTrash);
  TestValidator.equals(
    "trash count with incomplete filter",
    incompleteTrash.data.length,
    1,
  );
  TestValidator.equals(
    "incomplete trash contains todo2",
    incompleteTrash.data[0].id,
    todo2.id,
  );
  TestValidator.predicate(
    "incomplete todo is not complete",
    !incompleteTrash.data[0].is_complete,
  );
  // 8. Test user isolation - user2 should have empty trash
  const user2Trash = await api.functional.todoApp.member.trash.index(
    userConnection2,
    {
      body: { status: "all" } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(user2Trash);
  TestValidator.equals(
    "user2 trash should be empty",
    user2Trash.data.length,
    0,
  );
}
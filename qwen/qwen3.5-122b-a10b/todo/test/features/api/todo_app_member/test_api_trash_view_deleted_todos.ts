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

export async function test_api_trash_view_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create 3 todos (2 to delete, 1 to keep active)
  const todoToDelete1 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoToDelete1);
  const todoToDelete2 = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoToDelete2);
  const todoToKeep = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoToKeep);
  // 3. Soft delete 2 todos
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todoToDelete1.id,
  });
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todoToDelete2.id,
  });
  // 4. View trash
  const trashResult = await api.functional.todoApp.member.todos.trash.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(trashResult);
  // 5. Validate trash contents
  TestValidator.equals(
    "trash has 2 deleted todos",
    trashResult.pagination.records,
    2,
  );
  TestValidator.equals("trash has 1 page", trashResult.pagination.pages, 1);
  TestValidator.equals(
    "trash current page is 1",
    trashResult.pagination.current,
    1,
  );
  TestValidator.equals("trash limit is 10", trashResult.pagination.limit, 10);
  TestValidator.equals(
    "trash data array has 2 items",
    trashResult.data.length,
    2,
  );
  // Validate all returned todos are the expected deleted ones
  const deletedIds = new Set([todoToDelete1.id, todoToDelete2.id]);
  const activeTodoId = todoToKeep.id;
  for (const todo of trashResult.data) {
    TestValidator.predicate(
      "deleted todo id is in expected set",
      deletedIds.has(todo.id),
    );
    TestValidator.predicate("deleted todo has title", todo.title.length > 0);
  }
  // Verify active todo is NOT in trash
  const activeTodoInTrash = trashResult.data.find((t) => t.id === activeTodoId);
  TestValidator.predicate(
    "active todo not in trash",
    activeTodoInTrash === undefined,
  );
}

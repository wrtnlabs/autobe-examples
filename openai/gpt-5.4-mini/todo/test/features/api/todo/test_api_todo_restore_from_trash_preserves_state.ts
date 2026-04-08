import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_restore_from_trash_preserves_state(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234abcd",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  const todoBody = {
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const created: ITodoAppTodo =
    await generate_random_todo_app_member_todos_create(memberConnection, {
      body: todoBody,
    });
  typia.assert(created);
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: created.id,
  });
  const restored: ITodoAppTodo =
    await api.functional.todoApp.member.todos.restore.create(memberConnection, {
      todoId: created.id,
    });
  typia.assert(restored);
  TestValidator.equals("todo id preserved", restored.id, created.id);
  TestValidator.equals("title preserved", restored.title, created.title);
  TestValidator.equals(
    "description preserved",
    restored.description,
    created.description,
  );
  TestValidator.equals(
    "start date preserved",
    restored.startDate,
    created.startDate,
  );
  TestValidator.equals("due date preserved", restored.dueDate, created.dueDate);
  TestValidator.equals(
    "completion state preserved",
    restored.isCompleted,
    created.isCompleted,
  );
  TestValidator.equals("deletedAt cleared", restored.deletedAt, null);
  TestValidator.equals("owner preserved", restored.member, created.member);
}

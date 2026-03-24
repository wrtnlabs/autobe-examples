import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_restore_success_preserves_state_and_history(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ITodoAppMember.IJoin;
  await authorize_member_join(memberConnection, { body: credentials });
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  TestValidator.equals(
    "created todo is not in trash initially",
    createdTodo.deleted_in_trash_at,
    null,
  );
  TestValidator.equals(
    "created todo has known completion_status false",
    createdTodo.completion_status,
    false,
  );
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: createdTodo.id,
  });
  const restored =
    await api.functional.todoApp.member.todos.restore.restoreTodo(
      memberConnection,
      { todoId: createdTodo.id },
    );
  typia.assert(restored);
  TestValidator.equals("restored id preserved", restored.id, createdTodo.id);
  TestValidator.equals(
    "deleted_in_trash_at cleared on restore",
    restored.deleted_in_trash_at,
    null,
  );
  TestValidator.equals(
    "completion_status preserved on restore",
    restored.completion_status,
    createdTodo.completion_status,
  );
  TestValidator.equals(
    "restored title preserved",
    restored.title,
    createdTodo.title,
  );
}

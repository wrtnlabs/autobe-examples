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

export async function test_api_todo_restore_repeated_after_active_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITodoAppTodo.ICreate;
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: createBody,
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "created todo title matches input",
    todo.title,
    createBody.title,
  );
  TestValidator.equals(
    "created todo description matches input",
    todo.description,
    createBody.description ?? null,
  );
  TestValidator.equals("created todo starts active", todo.deleted_at, null);
  TestValidator.equals("created todo starts incomplete", todo.completed, false);
  TestValidator.equals(
    "created todo completion timestamp absent",
    todo.completed_at,
    null,
  );
  await TestValidator.httpError(
    "restore rejects already active todo",
    [400, 404, 409, 422],
    async () => {
      await api.functional.todoApp.member.todos.restore(memberConnection, {
        todoId: todo.id,
      });
    },
  );
  TestValidator.equals(
    "todo title remains unchanged in local snapshot",
    todo.title,
    createBody.title,
  );
  TestValidator.equals(
    "todo deleted marker remains cleared in local snapshot",
    todo.deleted_at,
    null,
  );
}

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

export async function test_api_todo_permanent_delete_other_member_unavailable(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      password: "Password1234!",
    },
  });
  typia.assert(ownerAuth);
  const ownerTodo = await generate_random_todo_app_member_todos_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(ownerTodo);
  TestValidator.equals(
    "created todo title matches input",
    ownerTodo.title,
    ownerTodo.title,
  );
  TestValidator.equals(
    "created todo is active before permanent delete",
    ownerTodo.deleted_at,
    null,
  );
  const attackerConnection: api.IConnection = { host: connection.host };
  const attackerAuth = await authorize_member_join(attackerConnection, {
    body: {
      password: "Password1234!",
    },
  });
  typia.assert(attackerAuth);
  TestValidator.notEquals(
    "owner and attacker are different members",
    ownerAuth.id,
    attackerAuth.id,
  );
  await TestValidator.httpError(
    "other member cannot permanently delete non-owned todo",
    [403, 404],
    async () => {
      await api.functional.todoApp.member.todos.erase(attackerConnection, {
        todoId: ownerTodo.id,
      });
    },
  );
  await TestValidator.httpError(
    "owner cannot permanently delete active todo before trashing",
    [400, 403, 404, 409, 422],
    async () => {
      await api.functional.todoApp.member.todos.erase(ownerConnection, {
        todoId: ownerTodo.id,
      });
    },
  );
}

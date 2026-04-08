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

/**
 * Verifies that a member cannot delete another member's todo.
 *
 * This test exercises the ownership boundary of the private todo app by
 * creating two independent authenticated members, creating a todo under the
 * first member, and then attempting to delete that todo while authenticated as
 * the second member.
 *
 * 1. Authenticate two separate members with isolated connections.
 * 2. Create a private todo for the first member.
 * 3. Attempt to delete the first member's todo as the second member.
 * 4. Assert the delete request is rejected by the ownership policy.
 */
export async function test_api_todo_delete_foreign_todo_blocked(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    } satisfies ITodoAppMember.IJoin,
  });
  const intruderConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    } satisfies ITodoAppMember.IJoin,
  });
  const ownerTodo = await generate_random_todo_app_member_todos_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(ownerTodo);
  await TestValidator.httpError(
    "foreign todo delete should be blocked",
    [400, 401, 403, 404],
    async () => {
      await api.functional.todoApp.member.todos.erase(intruderConnection, {
        todoId: ownerTodo.id,
      });
    },
  );
}

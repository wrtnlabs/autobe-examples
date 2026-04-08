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

export async function test_api_todo_update_other_member_private_access_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify private todo ownership enforcement on cross-member update attempts.
   *
   * This test validates that a todo created by one authenticated member cannot be
   * updated by another member in the private todo application. It checks the access
   * boundary enforced by the update endpoint and confirms the unauthorized request
   * is rejected.
   *
   * 1. Register and authenticate two distinct members using isolated connections.
   * 2. Create a todo owned by the first member.
   * 3. Attempt to update that todo using the second member's connection.
   * 4. Confirm the cross-member update is rejected.
   */
  const ownerConnection: api.IConnection = { host: connection.host };
  const otherConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  await authorize_member_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  const created = await generate_random_todo_app_member_todos_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  await TestValidator.error(
    "other member cannot update someone else's private todo",
    async () => {
      await api.functional.todoApp.member.todos.update(otherConnection, {
        todoId: created.id,
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          startDate: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
}

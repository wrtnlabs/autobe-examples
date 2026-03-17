import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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

export async function test_api_todo_restore_already_active_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new active todo (trashed_at will be null)
  const activeTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(activeTodo);
  // Verify the todo is indeed active (not in trash)
  TestValidator.equals(
    "todo is active (trashed_at is null)",
    activeTodo.trashed_at,
    null,
  );
  // Step 3: Attempt to restore the already-active todo — this should be rejected
  await TestValidator.httpError(
    "restore active todo should be rejected with 422",
    [400, 422],
    async () => {
      await api.functional.todoApp.member.todos.restore(memberConnection, {
        todoId: activeTodo.id,
      });
    },
  );
}

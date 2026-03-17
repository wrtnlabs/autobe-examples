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

/**
 * Test edge case where a user attempts to restore a todo that is not in trash (already active).
 * Steps: 1. Create member account via join. 2. Create a todo but do NOT delete it (keep it active).
 * 3. Attempt to call restore endpoint with the active todo's ID.
 * Validate that the system rejects the request with appropriate error.
 */
export async function test_api_todo_restore_not_in_trash_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an active todo (not in trash)
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Attempt to restore active todo (should fail as it's not in trash)
  await TestValidator.error(
    "restoring active todo (not in trash) should fail",
    async () => {
      await api.functional.todoApp.member.todos.trash.restore(
        memberConnection,
        {
          todoId: todo.id satisfies string,
        },
      );
    },
  );
}

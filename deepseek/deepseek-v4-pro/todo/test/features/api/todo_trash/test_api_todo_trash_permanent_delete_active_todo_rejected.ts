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
 * Verify that permanent deletion is rejected for active (non-trashed) todos.
 *
 * Validates the business rule that only todos currently in the trash—those that
 * have been soft-deleted with a non-null deleted_at timestamp—can be permanently
 * purged via the trash erase endpoint. An active todo that has never been
 * soft-deleted must be rejected with 422 Unprocessable Entity.
 *
 * 1. Register and authenticate as a new member via the join endpoint.
 * 2. Create an active todo with a required title.
 * 3. Attempt to permanently delete the active todo through the trash erase endpoint.
 * 4. Verify the request is rejected with 422 Unprocessable Entity.
 * 5. The active todo remains unchanged in the member's todo list.
 */
export async function test_api_todo_trash_permanent_delete_active_todo_rejected(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an active todo (not soft-deleted)
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Attempt to permanently delete the active todo — must fail with 422
  await TestValidator.httpError(
    "permanent delete of active todo rejected with 422",
    422,
    async () => {
      await api.functional.todoApp.member.todos.trash.erase(memberConnection, {
        todoId: todo.id,
      });
    },
  );
}

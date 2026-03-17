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

export async function test_api_todo_detail_cross_user_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Create a todo as Member A
  const memberATodo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(memberATodo);
  // 3. Register Member B (completely separate account)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. Member B tries to access Member A's todo — should be denied (404)
  await TestValidator.error(
    "Member B cannot access Member A's todo (cross-user access denied)",
    async () => {
      await api.functional.todoApp.member.todos.at(memberBConnection, {
        todoId: memberATodo.id,
      });
    },
  );
  // 5. Member B tries to access a non-existent todo — should also be denied (404)
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Member B cannot access a non-existent todo (404 for non-existent)",
    async () => {
      await api.functional.todoApp.member.todos.at(memberBConnection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}

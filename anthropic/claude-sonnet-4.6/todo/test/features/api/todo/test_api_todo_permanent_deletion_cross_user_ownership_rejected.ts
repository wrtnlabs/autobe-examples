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

export async function test_api_todo_permanent_deletion_cross_user_ownership_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A and obtain authenticated connection
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. As Member A, create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // 3. As Member A, soft-delete (trash) the todo
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  // 4. Register Member B with a different email and obtain authenticated connection
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 5. As Member B, attempt to permanently delete Member A's trashed todo
  //    This must result in HTTP 404 (not 403) to prevent data enumeration
  await TestValidator.httpError(
    "cross-user permanent deletion must return 404",
    404,
    async () => {
      await api.functional.todoApp.member.todos.permanent.erasePermanent(
        memberBConnection,
        { todoId: todo.id },
      );
    },
  );
  // 6. As Member A, confirm the todo still exists in trash by successfully
  //    permanently deleting it — proving Member B's attempt had no effect
  await api.functional.todoApp.member.todos.permanent.erasePermanent(
    memberAConnection,
    { todoId: todo.id },
  );
}

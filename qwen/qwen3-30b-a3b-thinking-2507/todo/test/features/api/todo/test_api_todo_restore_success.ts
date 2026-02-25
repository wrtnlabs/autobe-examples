import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_restore_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register new user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password12345",
    } satisfies ITodoAppUser.IJoin,
  });
  // Generate todo ID for restoration
  const todoId = typia.random<string & tags.Format<"uuid">>();
  // Restore the todo from trash
  const output = await api.functional.todoApp.user.trashes.restore(
    userConnection,
    {
      id: todoId,
    },
  );
  // Validate restoration
  typia.assert(output);
  TestValidator.equals(
    "completion status should be INCOMPLETE (false)",
    output.is_complete,
    false,
  );
  TestValidator.equals(
    "deleted_at should be null after restore",
    output.deleted_at,
    null,
  );
}

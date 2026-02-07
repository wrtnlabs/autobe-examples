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

export async function test_api_todo_trash_restore_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection through authorization
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. Attempt to restore a non-existent trash item with randomly generated trashId
  const trashId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify that restore with non-existent trashId throws 404 error
  await TestValidator.httpError(
    "non-existent trash restore should throw 404",
    404,
    async () => {
      await api.functional.todoApp.user.trash.restore(userConnection, {
        trashId: trashId,
      });
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_user_password_resets_create } from "../../../generate/generate_random_todo_user_password_resets_create";
import { prepare_random_todo_user_password_reset } from "../../../prepare/prepare_random_todo_user_password_reset";

export async function test_api_user_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Create user account
  const user = typia.assert<ITodoUser.IAuthorized>(
    await authorize_user_join(userConnection, {
      body: prepare_random_todo_user_password_reset() as ITodoUser.IJoin,
    }),
  );
  // Generate password reset token
  const resetToken = typia.assert<ITodoUserPasswordReset>(
    await generate_random_todo_user_password_resets_create(userConnection, {
      body: prepare_random_todo_user_password_reset() as ITodoUserPasswordReset.ICreate,
    }),
  );
  // New password
  const password = "TestPassword1!";
  // Reset password using token
  const updatedUser = typia.assert<ITodoUser.ISummary>(
    await api.functional.todo.user.password_resets.updatePassword(
      userConnection,
      {
        body: {
          token: resetToken.id,
          password:
            password satisfies ITodoUserPasswordReset.IRequest["password"],
        },
      },
    ),
  );
  typia.assert(updatedUser);
}

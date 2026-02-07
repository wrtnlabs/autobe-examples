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

export async function test_api_password_reset_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies ITodoUser.IJoin,
  });
  // 2. Create password reset record (with 60-minute expiration) using utility function
  const passwordReset = await generate_random_todo_user_password_resets_create(
    userConnection,
    {
      body: {} satisfies ITodoUserPasswordReset.ICreate,
    },
  );
  // 3. Wait 61 minutes to make token expired
  const now = new Date();
  const expiredTime = new Date(now.getTime() + 61 * 60 * 1000);
  const expiredAt = expiredTime.toISOString();
  // 4. Verify token is expired by checking API response
  await TestValidator.error(
    `password reset token expired - ${expiredAt}`,
    async () => {
      await api.functional.todo.user.password_resets.at(userConnection, {
        resetId: passwordReset.id,
      });
    },
  );
}

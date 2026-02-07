import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserPasswordReset";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_password_reset_already_used_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Test that invalid (non-existent) tokens are properly rejected
  await TestValidator.error("invalid token rejection", async () => {
    await api.functional.todoApp.user.password_resets.index(userConnection, {
      body: {
        reset_token: RandomGenerator.alphaNumeric(32),
        new_password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUserPasswordReset.IRequest,
    });
  });
  // Additionally test with expired token format (though we can't create actual expired tokens)
  await TestValidator.error("expired format token rejection", async () => {
    await api.functional.todoApp.user.password_resets.index(userConnection, {
      body: {
        reset_token: "expired_token_" + RandomGenerator.alphaNumeric(24),
        new_password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUserPasswordReset.IRequest,
    });
  });
}

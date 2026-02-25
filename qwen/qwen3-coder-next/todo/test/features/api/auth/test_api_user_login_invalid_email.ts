import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_invalid_email(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for login
  const userConnection: api.IConnection = { host: connection.host };
  // Try to login with non-existent email
  await TestValidator.error("invalid email returns 401", async () => {
    await api.functional.todoApp.auth.user.login(userConnection, {
      body: {
        email: "nonexistent@example.com",
        password: "password123",
      } satisfies ITodoAppUser.ILogin,
    });
  });
}

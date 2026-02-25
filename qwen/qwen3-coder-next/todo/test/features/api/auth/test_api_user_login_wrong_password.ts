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

export async function test_api_user_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a test user
  const registerConnection: api.IConnection = { host: connection.host };
  const registerEmail: string = typia.random<string & tags.Format<"email">>();
  const registerPassword: string = "password123";
  await authorize_user_join(registerConnection, {
    body: {
      email: registerEmail,
      password: registerPassword,
    } satisfies ITodoAppUser.IJoin,
  });
  // Step 2: Attempt login with wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  const wrongPassword = "wrongpassword";
  await TestValidator.error("should throw 401 for wrong password", async () => {
    await api.functional.todoApp.auth.user.login(loginConnection, {
      body: {
        email: registerEmail,
        password: wrongPassword,
      } satisfies ITodoAppUser.ILogin,
    });
  });
}

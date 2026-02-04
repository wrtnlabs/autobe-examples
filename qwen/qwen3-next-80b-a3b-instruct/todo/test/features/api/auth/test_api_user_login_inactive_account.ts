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

export async function test_api_user_login_inactive_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and register an inactive user
  const userConnection: api.IConnection = { host: connection.host };
  const inactiveUser: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.io`,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(inactiveUser);
  // Step 2: Create a second connection to attempt login with inactive user credentials
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login should fail for inactive account",
    async () => {
      await authorize_user_login(loginConnection, {
        body: {
          email: inactiveUser.email,
          password: "password123", // Using real password from registration
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
  // Optional: Verify that login fails with same error for non-existent account
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login should fail for non-existent account with same error message",
    async () => {
      await authorize_user_login(guestConnection, {
        body: {
          email: "nonexistent@example.com",
          password: "any_password",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}

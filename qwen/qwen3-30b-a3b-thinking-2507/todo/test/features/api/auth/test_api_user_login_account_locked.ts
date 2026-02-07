import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_account_locked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test user account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPassword123!",
      name: RandomGenerator.name(),
    } satisfies ITodoUser.IJoin,
  });
  // 2. Get the user's email
  const email: string = adminConnection.headers?.["X-User-Email"] as string;
  // 3. Simulate 5 failed login attempts
  for (let i = 0; i < 5; i++) {
    await TestValidator.error(`Failed login attempt ${i + 1}`, async () => {
      await authorize_user_login(adminConnection, {
        body: {
          email: email,
          password: "wrong_password",
        } satisfies ITodoUser.ILogin,
      });
    });
  }
  // 4. Verify account is locked
  await TestValidator.error(
    "Account should be locked after 5 failed attempts",
    async () => {
      await authorize_user_login(adminConnection, {
        body: {
          email: email,
          password: "wrong_password",
        } satisfies ITodoUser.ILogin,
      });
    },
  );
}

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

export async function test_api_user_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create a user account first using join utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "correctPassword123",
      display_name: typia.random<string>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Test 1: Login with incorrect password using utility function
  const loginConnection1: api.IConnection = { host: connection.host };
  await TestValidator.error("login with incorrect password", async () => {
    await authorize_user_login(loginConnection1, {
      body: {
        email: user.email,
        password: "wrongPassword456",
      } satisfies ITodoAppUser.ILogin,
    });
  });
  // Test 2: Login with non-existent email using utility function
  const loginConnection2: api.IConnection = { host: connection.host };
  await TestValidator.error("login with non-existent email", async () => {
    await authorize_user_login(loginConnection2, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "anyPassword789",
      } satisfies ITodoAppUser.ILogin,
    });
  });
  // Test 3: Verify connection headers remain clean after failed logins
  TestValidator.equals(
    "connection1 headers should not contain authorization after failed login",
    loginConnection1.headers?.Authorization,
    undefined,
  );
  TestValidator.equals(
    "connection2 headers should not contain authorization after failed login",
    loginConnection2.headers?.Authorization,
    undefined,
  );
  // Test 4: Rate limiting by attempting multiple failed logins with same email
  const rateLimitConnection: api.IConnection = { host: connection.host };
  for (let i = 0; i < 3; i++) {
    await TestValidator.error(`rate limit attempt ${i + 1}`, async () => {
      await authorize_user_login(rateLimitConnection, {
        body: {
          email: user.email,
          password: `wrongPassword${i}`,
        } satisfies ITodoAppUser.ILogin,
      });
    });
  }
}

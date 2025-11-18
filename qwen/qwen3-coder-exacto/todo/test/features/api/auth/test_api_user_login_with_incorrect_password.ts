import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Ensure login is rejected with incorrect password for a registered account.
 *
 * 1. Register a new user with unique credentials.
 * 2. Attempt to log in using the correct email but an incorrect password (with the
 *    same href/referrer/ip as registration for realistic context).
 * 3. Expect authentication to fail and an error to be thrown, verifying secure
 *    password handling and no token issuance.
 */
export async function test_api_user_login_with_incorrect_password(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListUser.ICreate;
  const registered = await api.functional.auth.user.join(connection, {
    body: userCreateBody,
  });
  typia.assert(registered);

  // 2. Attempt login with correct email and incorrect password
  const wrongPassword = RandomGenerator.alphaNumeric(16); // Must be different from real password
  await TestValidator.error("login fails with incorrect password", async () => {
    await api.functional.auth.user.login(connection, {
      body: {
        email: userCreateBody.email,
        password: wrongPassword,
        href: userCreateBody.href,
        referrer: userCreateBody.referrer,
        ip: userCreateBody.ip,
      } satisfies ITodoListUser.ILogin,
    });
  });
}

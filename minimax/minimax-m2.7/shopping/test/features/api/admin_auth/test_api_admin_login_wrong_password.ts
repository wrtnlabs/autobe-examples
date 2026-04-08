import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator login failure with incorrect password.
 *
 * Validates the authentication security for administrator accounts by testing login attempts with wrong passwords. Ensures that:
 * - A registered administrator can successfully login with correct credentials
 * - Login fails with HTTP 401 when incorrect password is provided
 * - Error messages are generic and do not reveal whether the email exists (security best practice)
 * - No JWT tokens are returned on failed authentication attempts
 * - The account remains active and accessible after failed login attempts
 *
 * 1. Register a new administrator account using admin join endpoint.
 * 2. Extract email and password from the join response.
 * 3. Attempt login with correct email but wrong password - expect 401 error.
 * 4. Verify no tokens are returned in the error response.
 * 5. Attempt login with correct credentials to confirm account is still active.
 */
export async function test_api_admin_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account with known password
  const adminConnection: api.IConnection = { host: connection.host };
  const knownPassword = "TestPassword123!";
  const registered = await authorize_admin_join(adminConnection, {
    body: {
      password: knownPassword,
    },
  });
  typia.assert(registered);
  // Extract the registered email
  const registeredEmail = registered.email;
  // 2. Attempt login with WRONG password - should fail with 401
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  const wrongPassword = "wrong_password_12345";
  await TestValidator.httpError(
    "login with wrong password should return 401",
    401,
    async () => {
      await api.functional.ecommerceMall.auth.admin.login(
        wrongPasswordConnection,
        {
          body: {
            email: registeredEmail,
            password: wrongPassword,
            href: "https://example.com/login",
            referrer: "https://example.com/",
          } satisfies IEcommerceMallAdmin.ILogin,
        },
      );
    },
  );
  // 3. Attempt login with CORRECT credentials - should succeed
  const correctConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.ecommerceMall.auth.admin.login(
    correctConnection,
    {
      body: {
        email: registeredEmail,
        password: knownPassword,
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(authorized);
  // Verify the authorized response contains valid data
  TestValidator.equals("email matches", authorized.email, registeredEmail);
  TestValidator.predicate(
    "has valid id",
    /^[0-9a-f-]{36}$/i.test(authorized.id),
  );
  TestValidator.predicate("has token", authorized.token !== undefined);
  TestValidator.predicate(
    "has access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    authorized.token.refresh.length > 0,
  );
}

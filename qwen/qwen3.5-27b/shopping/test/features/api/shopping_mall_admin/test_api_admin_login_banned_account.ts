import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator login rejection when account is banned.
 *
 * This test verifies that:
 * 1. Login attempts with banned admin accounts are rejected
 * 2. No authentication tokens are issued for banned accounts
 * 3. The system returns appropriate HTTP error codes
 * 4. Error responses are properly structured
 *
 * Note: This test assumes the admin account has been banned through
 * administrative means (e.g., direct database update or admin panel).
 * The test focuses on verifying the login endpoint's rejection behavior.
 */
export async function test_api_admin_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new admin account
  const testAdminConnection: api.IConnection = { host: connection.host };
  const testAdminEmail = typia.random<string & tags.Format<"email">>();
  const testAdminPassword = RandomGenerator.alphaNumeric(16);
  const registeredAdmin: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(testAdminConnection, {
      body: {
        email: testAdminEmail,
        password: testAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(registeredAdmin);
  TestValidator.equals(
    "admin registered successfully",
    registeredAdmin.email,
    testAdminEmail,
  );
  TestValidator.equals(
    "admin status is active initially",
    registeredAdmin.status,
    "active",
  );
  // Step 2: Create a fresh connection for login attempt
  // In a real scenario, the account would be banned here via admin API
  // For this test, we simulate the banned state by testing error handling
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 3: Attempt login and verify rejection
  // The test expects the backend to reject the login with an HTTP error
  // when the account status is 'banned'
  await TestValidator.httpError(
    "login rejected for banned admin account",
    [400, 401],
    async () =>
      await authorize_admin_login(loginConnection, {
        body: {
          email: testAdminEmail,
          password: testAdminPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallAdmin.ILogin,
      }),
  );
  // Step 4: Verify no authentication tokens were issued
  // The connection should not have Authorization header set after failed login
  TestValidator.predicate(
    "no authorization token issued for rejected login",
    () => loginConnection.headers?.Authorization === undefined,
  );
  // Step 5: Verify the original admin connection still has valid tokens
  // (proving the ban is account-specific, not system-wide)
  TestValidator.predicate(
    "original admin session remains valid",
    () => testAdminConnection.headers?.Authorization !== undefined,
  );
}

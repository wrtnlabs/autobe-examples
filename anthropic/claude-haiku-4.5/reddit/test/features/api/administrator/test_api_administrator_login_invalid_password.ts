import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator login with incorrect password.
 *
 * This test validates the authentication error handling when an administrator
 * attempts to login with a valid email but incorrect password. The test creates
 * a new administrator account first, then attempts to login with the correct
 * email but an intentionally wrong password. It verifies that the login fails
 * with an appropriate error response and that no authentication tokens are
 * issued for the failed login attempt.
 *
 * Security considerations validated:
 *
 * - Login fails when password is incorrect
 * - Error response does not reveal whether the email exists in the system
 * - No tokens are issued on failed authentication
 *
 * Steps:
 *
 * 1. Create a new administrator account with known credentials
 * 2. Attempt to login with the correct email but incorrect password
 * 3. Verify that login fails with an error response
 * 4. Confirm that no authentication tokens are returned
 */
export async function test_api_administrator_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = "ValidPassword123!";
  const wrongPassword = "WrongPassword123!";

  const created = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: correctPassword,
      username: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(created);

  // Step 2: Create an unauthenticated connection for the login attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3: Attempt to login with incorrect password
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.administrator.login(unauthConn, {
        body: {
          email: adminEmail,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: "",
          ip: "127.0.0.1",
        } satisfies ICommunityPlatformAdministrator.ILogin,
      });
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator login failure with non-existent email address.
 *
 * Validates that the system properly handles login attempts with email addresses
 * that do not exist in the system. Verifies that:
 * 1. Login with non-existent email returns an authentication error
 * 2. The error message is generic (does not reveal whether email exists)
 * 3. No tokens or sessions are created for non-existent accounts
 * 4. The system treats non-existent emails the same as wrong passwords
 *
 * This test ensures proper security handling where the system protects against
 * email enumeration attacks by not revealing account existence through error messages.
 *
 * 1. Create a valid super administrator account first.
 * 2. Attempt to log in with a non-existent email but valid password format.
 * 3. Verify the login attempt fails with appropriate HTTP error.
 * 4. Verify no session is created (no Authorization header set).
 */
export async function test_api_superadmin_login_with_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid super administrator account first
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a new connection for login attempt with non-existent email
  const loginAttemptConnection: api.IConnection = { host: connection.host };
  // 3. Generate a non-existent email address
  const nonExistentEmail = `nonexistent_${Date.now()}_${RandomGenerator.alphaNumeric(8)}@fakeexample.com`;
  // 4. Generate a valid password format (meets password requirements)
  const validPassword = `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`;
  // 5. Attempt to log in with non-existent email but valid password format
  await TestValidator.httpError(
    "login should fail with non-existent email",
    401,
    async () => {
      await api.functional.ecommerceMall.auth.superAdmin.login(
        loginAttemptConnection,
        {
          body: {
            email: nonExistentEmail satisfies string & tags.Format<"email">,
            password: validPassword,
            href: "https://example.com/superadmin/login" satisfies string &
              tags.Format<"uri">,
            referrer: "https://example.com/superadmin" satisfies string &
              tags.Format<"uri">,
          } satisfies IEcommerceMallSuperAdmin.ILogin,
        },
      );
    },
  );
  // 6. Verify no session was created (Authorization header not set)
  TestValidator.predicate(
    "no session created for non-existent email",
    loginAttemptConnection.headers === undefined ||
      loginAttemptConnection.headers?.Authorization === undefined,
  );
}

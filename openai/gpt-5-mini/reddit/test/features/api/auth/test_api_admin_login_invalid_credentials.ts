import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

/**
 * Validate that admin login with invalid credentials fails while account
 * exists.
 *
 * Business intent:
 *
 * 1. Provision a new admin account via POST /auth/admin/join.
 * 2. Attempt to authenticate using the correct identifier but an incorrect
 *    password and assert that authentication fails (an error is thrown).
 * 3. Authenticate with the correct password to confirm the account exists and
 *    valid credentials produce tokens.
 *
 * Notes:
 *
 * - Do NOT inspect or assert HTTP status codes or error messages. Use
 *   TestValidator.error to assert that the invalid login attempt throws.
 * - Do NOT manipulate connection.headers; SDK manages headers automatically.
 */
export async function test_api_admin_login_invalid_credentials(
  connection: api.IConnection,
) {
  // 1) Create a new admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name(1)
    .replace(/\s+/g, "")
    .toLowerCase();
  const adminPassword = "P@ssw0rd!"; // Use a valid-looking password for E2E

  const createBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(1),
    isActive: true,
  } satisfies ICommunityPortalAdmin.ICreate;

  const created: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  // Validate response shape exactly
  typia.assert(created);

  // Basic business assertions about created user
  TestValidator.equals(
    "created admin username matches request",
    created.user.username,
    createBody.username,
  );

  // 2) Attempt login with incorrect password -> should throw
  await TestValidator.error(
    "admin login with incorrect password should fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          identifier: adminEmail,
          password: "incorrect-password",
        } satisfies ICommunityPortalAdmin.ILogin,
      });
    },
  );

  // 3) Authenticate with correct password to confirm account works
  const auth: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        identifier: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPortalAdmin.ILogin,
    });
  typia.assert(auth);

  TestValidator.equals(
    "login returns the same username",
    auth.user.username,
    createBody.username,
  );

  // Ensure token object exists and contains expected properties by type assertion
  typia.assert<IAuthorizationToken>(auth.token);
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof auth.token.access === "string" && auth.token.access.length > 0,
  );
}

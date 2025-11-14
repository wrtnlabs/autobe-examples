import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";

export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // Create new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminRole = "admin";

  // Use bcrypt hash string as password_hash (60-character format)
  // This is a valid bcrypt hash format string, required by ITodoAppAdmin.ICreate
  const passwordHash =
    "$2b$10$LHnpyu4iy.vETxcO.u3wuuu4VFCZXJ0QzxuDVmoqzx90fgtvg4WmS";

  // Use join endpoint to create admin account
  const createdAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
        role: adminRole,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Validate created admin response structure
  TestValidator.equals(
    "created admin email matches",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "created admin role matches",
    createdAdmin.role,
    adminRole,
  );
  TestValidator.predicate(
    "has valid access token",
    () => !!createdAdmin.token.access,
  );
  TestValidator.predicate(
    "has valid refresh token",
    () => !!createdAdmin.token.refresh,
  );

  // Use login endpoint to authenticate created admin
  const ip = RandomGenerator.alphaNumeric(15);
  const href = "https://todoapp.com/login";
  const referrer = "https://google.com";

  const loggedAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: ip,
        href: href,
        referrer: referrer,
      } satisfies ITodoAppAdmin.IAuth,
    });
  typia.assert(loggedAdmin);

  // Validate login response structure
  TestValidator.equals(
    "logged admin email matches",
    loggedAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "logged admin role matches",
    loggedAdmin.role,
    adminRole,
  );
  TestValidator.predicate(
    "has valid access token after login",
    () => !!loggedAdmin.token.access,
  );
  TestValidator.predicate(
    "has valid refresh token after login",
    () => !!loggedAdmin.token.refresh,
  );

  // Ensure login resulted in a new session (tokens are different)
  TestValidator.notEquals(
    "login token access differs from join token",
    loggedAdmin.token.access,
    createdAdmin.token.access,
  );
  TestValidator.notEquals(
    "login token refresh differs from join token",
    loggedAdmin.token.refresh,
    createdAdmin.token.refresh,
  );
}

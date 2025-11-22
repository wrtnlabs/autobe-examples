import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  // Generate unique test data for admin account creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 12,
  }); // Generate secure password
  const roleLevel = RandomGenerator.pick([
    "super_admin",
    "admin",
    "moderator",
  ] as const);
  const accountStatus = "active";

  // Step 1: Create new administrator account
  const createdAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword, // In real scenario this would be hashed
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: roleLevel,
        status: accountStatus,
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Authenticate with the created credentials
  const loginResponse: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.100",
        href: "https://admin.todoapp.com/login",
        referrer: "https://admin.todoapp.com/dashboard",
      } satisfies ITodoAppAdministrator.ILogin,
    });
  typia.assert(loginResponse);

  // Step 3: Validate the authentication response
  TestValidator.equals(
    "admin ID should be returned",
    loginResponse.id,
    createdAdmin.id,
  );
  TestValidator.predicate(
    "access token should be present",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token should not be empty",
    loginResponse.token.access.trim().length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    loginResponse.token.refresh.trim().length > 0,
  );
  TestValidator.predicate(
    "expired_at should be valid date format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      loginResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until should be valid date format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      loginResponse.token.refreshable_until,
    ),
  );

  // Step 4: Validate token expiration logic
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate(
    "access token should expire in future",
    expiredAt.getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh token should expire after access token",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}

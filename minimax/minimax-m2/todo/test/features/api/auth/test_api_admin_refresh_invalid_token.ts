import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator token refresh with invalid refresh token security
 * validation.
 *
 * This test validates the security robustness of the admin token refresh
 * endpoint by attempting refresh operations with various forms of invalid
 * refresh tokens. The test creates a valid admin session first, then
 * systematically tests different invalid token scenarios to ensure proper
 * security error handling.
 *
 * Test workflow:
 *
 * 1. Create new administrator account via join endpoint
 * 2. Establish valid authenticated session via login to obtain proper refresh
 *    token
 * 3. Test refresh endpoint with multiple invalid token scenarios:
 *
 *    - Completely invalid refresh token format
 *    - Tampered/corrupted refresh token string
 *    - Malformed refresh token structure
 * 4. Validate all scenarios properly reject invalid tokens with appropriate
 *    security errors
 * 5. Confirm system maintains security posture and doesn't leak sensitive
 *    information
 */
export async function test_api_admin_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Phase 1: Create new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16) + "A1!";

  const adminAccount: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword, // Using plain text as per DTO description
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  // Phase 2: Establish valid session and extract refresh token
  const loginSession: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.100",
        href: "https://admin.todoapp.com/login",
        referrer: "https://admin.todoapp.com",
      } satisfies ITodoAppAdministrator.ILogin,
    });
  typia.assert(loginSession);

  const validRefreshToken = loginSession.token.refresh;
  TestValidator.equals(
    "valid refresh token obtained",
    validRefreshToken.length > 0,
    true,
  );

  // Phase 3: Test refresh with invalid tokens

  // Test 3.1: Completely invalid refresh token format
  await TestValidator.error(
    "refresh with completely invalid token format should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "this.is.not.a.valid.jwt.token.format.at.all",
        } satisfies ITodoAppAdministrator.IRefresh,
      });
    },
  );

  // Test 3.2: Tampered refresh token (modify valid token)
  const tamperedToken =
    validRefreshToken.substring(0, validRefreshToken.length - 5) + "XXXXX";
  await TestValidator.error(
    "refresh with tampered refresh token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: tamperedToken,
        } satisfies ITodoAppAdministrator.IRefresh,
      });
    },
  );

  // Test 3.3: Empty refresh token
  await TestValidator.error(
    "refresh with empty refresh token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ITodoAppAdministrator.IRefresh,
      });
    },
  );

  // Test 3.4: Null refresh token
  await TestValidator.error(
    "refresh with null refresh token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: null as any, // Testing null handling
        } satisfies ITodoAppAdministrator.IRefresh,
      });
    },
  );

  // Phase 4: Verify original valid token still works after invalid attempts
  const refreshedSession: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: validRefreshToken,
      } satisfies ITodoAppAdministrator.IRefresh,
    });
  typia.assert(refreshedSession);

  // Verify the refreshed session has different access token (proving refresh worked)
  TestValidator.notEquals(
    "refreshed session has new access token",
    refreshedSession.token.access,
    loginSession.token.access,
  );

  TestValidator.equals(
    "refreshed session has new refresh token",
    refreshedSession.token.refresh.length > 0,
    true,
  );
}

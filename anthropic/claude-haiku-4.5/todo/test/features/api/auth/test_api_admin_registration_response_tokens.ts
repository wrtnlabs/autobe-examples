import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test that admin registration returns valid JWT tokens with proper structure
 * and expiration timing.
 *
 * This test validates the complete JWT token response from admin registration:
 *
 * - Tokens are properly formatted with three parts separated by dots
 * - Access token has shorter expiration than refresh token
 * - Connection Authorization header is automatically set with access token
 */
export async function test_api_admin_registration_response_tokens(
  connection: api.IConnection,
) {
  // 1. Register new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

  const response: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });

  // Validate response structure and all types
  typia.assert(response);

  const token: IAuthorizationToken = response.token;

  // 2. Validate access and refresh tokens are non-empty strings
  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // 3. Validate JWT structure (three parts separated by dots)
  const accessParts = token.access.split(".");
  TestValidator.equals(
    "access token should have three parts (header.payload.signature)",
    accessParts.length,
    3,
  );

  const refreshParts = token.refresh.split(".");
  TestValidator.equals(
    "refresh token should have three parts (header.payload.signature)",
    refreshParts.length,
    3,
  );

  // 4. Validate expiration timing - access token should expire before refresh token
  const accessExpiry = new Date(token.expired_at).getTime();
  const refreshExpiry = new Date(token.refreshable_until).getTime();

  TestValidator.predicate(
    "access token should expire before refresh token",
    accessExpiry < refreshExpiry,
  );

  // 5. Validate access token expires in the future
  const now = new Date().getTime();
  TestValidator.predicate(
    "access token should not be expired",
    accessExpiry > now,
  );

  // 6. Validate refresh token expires further in the future
  TestValidator.predicate(
    "refresh token should not be expired",
    refreshExpiry > accessExpiry,
  );

  // 7. Validate admin response data
  TestValidator.equals(
    "admin email should match registration email",
    response.email,
    adminEmail,
  );

  // 8. Validate connection's Authorization header is set with access token
  TestValidator.equals(
    "connection Authorization header should be set with access token",
    connection.headers?.Authorization,
    token.access,
  );
}

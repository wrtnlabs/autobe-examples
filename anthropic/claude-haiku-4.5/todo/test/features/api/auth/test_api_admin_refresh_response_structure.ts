import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test that refresh response contains complete and correctly structured
 * authorization information.
 *
 * This test validates the admin refresh endpoint by verifying that the response
 * contains all required fields with correct types and formats:
 *
 * - Id: UUID format identifier
 * - Email: Valid email format
 * - Created_at: ISO 8601 timestamp
 * - Updated_at: ISO 8601 timestamp
 * - Token object with access, refresh, expired_at, and refreshable_until
 *   properties
 *
 * Steps:
 *
 * 1. Login with admin credentials to obtain initial tokens
 * 2. Extract refresh token from login response
 * 3. Call refresh endpoint with the refresh token
 * 4. Validate complete response structure using typia.assert()
 * 5. Verify response consistency with login response
 */
export async function test_api_admin_refresh_response_structure(
  connection: api.IConnection,
) {
  // Step 1: Login with admin credentials to get initial tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(8);

  const loginResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });

  typia.assert(loginResponse);

  // Step 2: Extract refresh token from login response
  const refreshToken = loginResponse.token.refresh;

  // Step 3: Call refresh endpoint with the refresh token
  const refreshResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoAppAdmin.IRefresh,
    });

  // Step 4: Validate complete response structure
  // typia.assert() validates all required fields, types, and formats:
  // - id is valid UUID
  // - email is valid email format
  // - created_at and updated_at are valid ISO 8601 date-time
  // - token contains access, refresh, expired_at, and refreshable_until strings
  typia.assert(refreshResponse);

  // Step 5: Verify response consistency with login response
  TestValidator.equals(
    "refreshed admin should have same id as login response",
    refreshResponse.id,
    loginResponse.id,
  );

  TestValidator.equals(
    "refreshed admin should have same email as login response",
    refreshResponse.email,
    loginResponse.email,
  );

  TestValidator.equals(
    "refreshed admin should have same created_at as login response",
    refreshResponse.created_at,
    loginResponse.created_at,
  );

  TestValidator.predicate(
    "refreshed admin updated_at should be later or equal to login response",
    new Date(refreshResponse.updated_at) >= new Date(loginResponse.updated_at),
  );
}

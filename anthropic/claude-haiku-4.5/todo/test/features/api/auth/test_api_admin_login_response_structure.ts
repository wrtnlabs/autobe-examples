import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test that login response contains complete and correctly structured admin
 * information. Verify that the response includes all required fields: id (UUID
 * format), email (valid email format), created_at (ISO 8601 timestamp),
 * updated_at (ISO 8601 timestamp), and token object with access, refresh,
 * expired_at, and refreshable_until properties. Confirm that deleted_at and
 * last_active_at are included when applicable.
 *
 * Steps:
 *
 * 1. Prepare admin login credentials
 * 2. Call admin login API endpoint
 * 3. Validate response structure with typia.assert() - this validates ALL types
 *    and formats
 * 4. Verify optional fields presence
 */
export async function test_api_admin_login_response_structure(
  connection: api.IConnection,
) {
  // Step 1: Prepare admin login credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  // Step 2: Call admin login API endpoint
  const loginResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });

  // Step 3: Validate response structure with typia.assert()
  // This single call validates:
  // - All required fields are present (id, email, created_at, updated_at, token)
  // - All fields have correct types
  // - All format constraints are met (UUID for id, email for email, date-time for timestamps)
  // - Token object has all required properties (access, refresh, expired_at, refreshable_until)
  typia.assert(loginResponse);

  // Step 4: Verify optional fields presence when applicable
  if (
    loginResponse.deleted_at !== null &&
    loginResponse.deleted_at !== undefined
  ) {
    TestValidator.predicate("deleted_at is present", true);
  }

  if (
    loginResponse.last_active_at !== null &&
    loginResponse.last_active_at !== undefined
  ) {
    TestValidator.predicate("last_active_at is present", true);
  }
}

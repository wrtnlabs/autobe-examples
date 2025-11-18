import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validates the successful refresh token workflow for an authenticated admin.
 *
 * This test simulates an admin token refresh operation by providing a valid
 * refresh token of an active and unlocked admin account. It verifies that a new
 * JWT token pair is returned and ensures all expected fields are present and
 * well-formed according to the documented DTOs:
 *
 * 1. Prepare a valid ITodoListAdmin.IRefresh request (with a random refresh_token
 *    string).
 * 2. Call the api.functional.auth.admin.refresh endpoint with this input.
 * 3. Assert the output response matches ITodoListAdmin.IAuthorized type and
 *    includes a new token pair (access, refresh, expired_at,
 *    refreshable_until).
 * 4. Assert all critical fields (id, email, locked, role, token structure,
 *    timestamps) are present and properly formatted.
 * 5. Optionally: Additional checks to ensure the returned admin account is not
 *    locked or deleted, and the access token is non-empty.
 */
export async function test_api_admin_refresh_token_successful(
  connection: api.IConnection,
) {
  // 1. Prepare a valid refresh token input
  const requestBody = {
    refresh_token: RandomGenerator.alphaNumeric(32),
  } satisfies ITodoListAdmin.IRefresh;

  // 2. Call the admin refresh endpoint
  const output = await api.functional.auth.admin.refresh(connection, {
    body: requestBody,
  });

  // 3. Assert the output matches expected DTO
  typia.assert<ITodoListAdmin.IAuthorized>(output);

  // 4. Check key field validity
  TestValidator.predicate(
    "admin id is valid uuid",
    typeof output.id === "string" && output.id.length > 0,
  );
  TestValidator.predicate(
    "admin email is valid email",
    typeof output.email === "string" && output.email.includes("@"),
  );
  TestValidator.equals("admin account is not locked", output.locked, false);
  TestValidator.predicate(
    "admin role is string and not empty",
    typeof output.role === "string" && output.role.length > 0,
  );
  TestValidator.predicate(
    "admin created_at is date-time string",
    typeof output.created_at === "string" && output.created_at.includes("T"),
  );
  TestValidator.predicate(
    "admin updated_at is date-time string",
    typeof output.updated_at === "string" && output.updated_at.includes("T"),
  );
  // deleted_at may be null/undefined or string. Allow null/undefined.

  // 5. Assert the token structure in response
  typia.assert<IAuthorizationToken>(output.token);
  TestValidator.predicate(
    "access token is non-empty string",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is date-time string",
    typeof output.token.expired_at === "string" &&
      output.token.expired_at.includes("T"),
  );
  TestValidator.predicate(
    "refreshable_until is date-time string",
    typeof output.token.refreshable_until === "string" &&
      output.token.refreshable_until.includes("T"),
  );
}

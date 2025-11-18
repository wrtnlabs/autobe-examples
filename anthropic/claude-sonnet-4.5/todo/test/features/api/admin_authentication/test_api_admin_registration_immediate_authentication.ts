import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that administrator registration immediately establishes an authenticated
 * session.
 *
 * Validates the seamless registration-to-authentication flow for admin
 * accounts. When a new administrator registers, the system should immediately
 * return JWT tokens (both access and refresh) that can be used for
 * authenticated admin operations without requiring a separate login step.
 *
 * Process:
 *
 * 1. Generate unique admin registration credentials
 * 2. Register a new admin account via the join endpoint
 * 3. Verify the response contains valid admin account information
 * 4. Verify JWT tokens are included in the response
 * 5. Confirm the access token is automatically set in connection headers
 * 6. Validate token expiration timestamps are correct
 */
export async function test_api_admin_registration_immediate_authentication(
  connection: api.IConnection,
) {
  // Step 1: Prepare registration data with unique credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const registrationData = {
    email: adminEmail,
    password: adminPassword,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  // Step 2: Register the new admin account
  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate the response structure and data
  typia.assert(registeredAdmin);

  // Step 4: Verify admin account information
  TestValidator.predicate(
    "admin ID should be a valid UUID",
    typia.is<string & tags.Format<"uuid">>(registeredAdmin.id),
  );

  TestValidator.equals(
    "registered email should match input email",
    registeredAdmin.email,
    adminEmail,
  );

  TestValidator.predicate(
    "created_at timestamp should be valid",
    typia.is<string & tags.Format<"date-time">>(registeredAdmin.created_at),
  );

  TestValidator.predicate(
    "updated_at timestamp should be valid",
    typia.is<string & tags.Format<"date-time">>(registeredAdmin.updated_at),
  );

  // Step 5: Verify JWT token object is present
  TestValidator.predicate(
    "token object should be present",
    registeredAdmin.token !== null && registeredAdmin.token !== undefined,
  );

  // Step 6: Validate access token
  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof registeredAdmin.token.access === "string" &&
      registeredAdmin.token.access.length > 0,
  );

  // Step 7: Validate refresh token
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    typeof registeredAdmin.token.refresh === "string" &&
      registeredAdmin.token.refresh.length > 0,
  );

  // Step 8: Validate token expiration timestamps
  TestValidator.predicate(
    "expired_at should be a valid date-time",
    typia.is<string & tags.Format<"date-time">>(
      registeredAdmin.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refreshable_until should be a valid date-time",
    typia.is<string & tags.Format<"date-time">>(
      registeredAdmin.token.refreshable_until,
    ),
  );

  // Step 9: Verify token expiration times are in the future
  const now = new Date();
  const expiredAt = new Date(registeredAdmin.token.expired_at);
  const refreshableUntil = new Date(registeredAdmin.token.refreshable_until);

  TestValidator.predicate(
    "access token expiration should be in the future",
    expiredAt > now,
  );

  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshableUntil > now,
  );

  // Step 10: Verify the access token was automatically set in connection headers
  // The SDK automatically sets connection.headers.Authorization after successful registration
  TestValidator.predicate(
    "connection headers should contain Authorization token",
    connection.headers !== undefined &&
      connection.headers.Authorization === registeredAdmin.token.access,
  );
}

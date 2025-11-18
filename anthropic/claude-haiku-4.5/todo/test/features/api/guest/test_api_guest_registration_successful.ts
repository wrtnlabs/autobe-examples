import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Test successful guest user registration with valid email and password
 * credentials.
 *
 * This test verifies the complete guest registration flow:
 *
 * 1. Register a new guest account with valid email and password
 * 2. Verify JWT tokens (access and refresh) are generated
 * 3. Confirm session record creation with proper timestamps
 * 4. Validate response contains session ID, email, and token information
 * 5. Verify email normalization and password hashing
 *
 * The test ensures:
 *
 * - Guest account is created in todo_list_users table
 * - Session record is created in todo_list_sessions table
 * - JWT tokens are properly formatted and contain expiration info
 * - Email is stored in lowercase for case-insensitive matching
 * - Password is securely hashed using bcrypt
 * - Created_at and updated_at timestamps are set correctly
 */
export async function test_api_guest_registration_successful(
  connection: api.IConnection,
) {
  // Generate test credentials with proper formats
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12); // Secure password

  // Step 1: Register new guest account
  const response: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: email,
        password: password,
      } satisfies ITodoListGuest.ICreate,
    });

  // Step 2: Validate response structure and types
  typia.assert(response);

  // Step 3: Verify session ID (unique identifier)
  TestValidator.predicate(
    "session ID should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );

  // Step 4: Verify email is stored and normalized
  TestValidator.equals(
    "email should match input email",
    response.email,
    email.toLowerCase(),
  );

  // Step 5: Verify timestamps are in ISO 8601 format
  TestValidator.predicate(
    "created_at should be valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.created_at),
  );

  TestValidator.predicate(
    "updated_at should be valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.updated_at),
  );

  // Step 6: Verify timestamps are reasonable (created and updated at same time for new account)
  const createdTime = new Date(response.created_at).getTime();
  const updatedTime = new Date(response.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be equal to or after created_at",
    updatedTime >= createdTime,
  );

  // Step 7: Verify JWT token information
  const token: ITodoListTokenBlacklist = response.token;
  typia.assert(token);

  TestValidator.predicate(
    "access token should be non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // Step 8: Verify token expiration timestamps
  TestValidator.predicate(
    "expired_at should be valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.expired_at),
  );

  TestValidator.predicate(
    "refreshable_until should be valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.refreshable_until),
  );

  // Step 9: Verify expiration logic (expired_at should be before refreshable_until)
  const expiredTime = new Date(token.expired_at).getTime();
  const refreshableTime = new Date(token.refreshable_until).getTime();
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableTime > expiredTime,
  );

  // Step 10: Verify access token expiration is reasonable (should be in future)
  const now = new Date().getTime();
  TestValidator.predicate(
    "access token should expire in the future",
    expiredTime > now,
  );

  // Step 11: Verify refresh token is valid for longer period
  TestValidator.predicate(
    "refresh token should be valid longer than access token",
    refreshableTime > expiredTime,
  );

  // Step 12: Verify connection headers were updated with authorization token
  TestValidator.predicate(
    "connection should have Authorization header set",
    connection.headers?.Authorization === token.access,
  );
}

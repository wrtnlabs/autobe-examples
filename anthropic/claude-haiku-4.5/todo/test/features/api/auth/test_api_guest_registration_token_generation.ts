import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Test guest user registration with JWT token generation.
 *
 * Validates that guest users can successfully register and receive properly
 * formatted JWT tokens with appropriate expiration times. This test ensures:
 *
 * - Registration endpoint accepts valid email and password
 * - Access and refresh tokens are generated in JWT format
 * - Token expiration timestamps are properly set
 * - Access token expires before refresh token (shorter expiration window)
 * - Guest session is initialized with metadata timestamps
 *
 * Test flow:
 *
 * 1. Generate random guest credentials (email and password)
 * 2. Call guest registration API endpoint
 * 3. Validate response contains guest user data and token information
 * 4. Verify token structure (JWT format with access and refresh tokens)
 * 5. Validate token expiration timestamps (expired_at and refreshable_until)
 * 6. Confirm access token has shorter expiration than refresh token
 * 7. Verify guest user timestamps (created_at, updated_at)
 */
export async function test_api_guest_registration_token_generation(
  connection: api.IConnection,
) {
  // Generate random guest registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12); // At least 1 character as required

  // Register new guest user
  const guest = await api.functional.auth.guest.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListGuest.ICreate,
  });

  // Validate guest response
  typia.assert(guest);
  typia.assert<ITodoListGuest.IAuthorized>(guest);

  // Verify all required guest user fields are present
  TestValidator.predicate(
    "guest has unique session id",
    guest.id !== null && guest.id !== undefined,
  );
  TestValidator.equals("guest email matches input", guest.email, email);
  TestValidator.predicate(
    "guest has creation timestamp",
    guest.created_at !== null && guest.created_at !== undefined,
  );
  TestValidator.predicate(
    "guest has update timestamp",
    guest.updated_at !== null && guest.updated_at !== undefined,
  );

  // Validate token structure
  TestValidator.predicate(
    "token object exists",
    guest.token !== null && guest.token !== undefined,
  );
  TestValidator.predicate(
    "access token is string",
    typeof guest.token.access === "string",
  );
  TestValidator.predicate(
    "refresh token is string",
    typeof guest.token.refresh === "string",
  );
  TestValidator.predicate(
    "access token not empty",
    guest.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token not empty",
    guest.token.refresh.length > 0,
  );

  // Validate JWT token format (should have 3 parts separated by dots)
  TestValidator.predicate(
    "access token is valid JWT format",
    guest.token.access.split(".").length === 3,
  );
  TestValidator.predicate(
    "refresh token is valid JWT format",
    guest.token.refresh.split(".").length === 3,
  );

  // Validate token expiration timestamps
  TestValidator.predicate(
    "expired_at is ISO 8601 date string",
    typeof guest.token.expired_at === "string",
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 date string",
    typeof guest.token.refreshable_until === "string",
  );

  // Parse expiration dates
  const accessExpiration = new Date(guest.token.expired_at);
  const refreshExpiration = new Date(guest.token.refreshable_until);
  const now = new Date();

  // Validate expiration dates are in the future
  TestValidator.predicate(
    "access token expiration is in future",
    accessExpiration > now,
  );
  TestValidator.predicate(
    "refresh token expiration is in future",
    refreshExpiration > now,
  );

  // Validate access token has shorter expiration than refresh token
  TestValidator.predicate(
    "access token expires before refresh token",
    accessExpiration < refreshExpiration,
  );

  // Verify the expiration window difference is reasonable (access token typically 15 minutes, refresh token typically 7 days)
  const expirationDiff =
    refreshExpiration.getTime() - accessExpiration.getTime();
  const fifteenMinutesMs = 15 * 60 * 1000;
  TestValidator.predicate(
    "refresh token expires significantly later than access token",
    expirationDiff > fifteenMinutesMs,
  );

  // Validate timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid timestamp",
    !isNaN(new Date(guest.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    !isNaN(new Date(guest.updated_at).getTime()),
  );

  // Validate optional last_login_at field (may be null or undefined on first registration)
  if (guest.last_login_at) {
    TestValidator.predicate(
      "last_login_at is valid timestamp",
      !isNaN(new Date(guest.last_login_at).getTime()),
    );
  }
}

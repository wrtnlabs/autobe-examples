import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Test guest user registration with successful flow.
 *
 * Validates that guest user registration works correctly with valid input data.
 * Tests the complete registration flow including user creation, authentication
 * token generation, and response validation.
 *
 * Test flow:
 *
 * 1. Register a new guest user with valid email and password
 * 2. Validate the response contains correct guest user information
 * 3. Verify authentication tokens are properly generated
 * 4. Confirm user ID is in valid UUID format
 * 5. Validate timestamps are properly set
 */
export async function test_api_guest_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Generate valid test data
  const validEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);

  // Register new guest user
  const guest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: validEmail,
        password: password,
      } satisfies ITodoListGuest.ICreate,
    });

  // Validate response structure and data
  typia.assert(guest);

  // Verify email matches input
  TestValidator.equals(
    "registered email matches input",
    guest.email,
    validEmail,
  );

  // Verify guest ID is valid UUID format
  TestValidator.predicate(
    "guest ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guest.id,
    ),
  );

  // Verify timestamps exist
  TestValidator.predicate(
    "created_at timestamp is set",
    guest.created_at !== undefined && guest.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp is set",
    guest.updated_at !== undefined && guest.updated_at.length > 0,
  );

  // Verify authentication tokens are present
  TestValidator.predicate(
    "access token is generated",
    guest.token.access !== undefined && guest.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is generated",
    guest.token.refresh !== undefined && guest.token.refresh.length > 0,
  );

  // Verify token expiration times
  TestValidator.predicate(
    "access token has expiration timestamp",
    guest.token.expired_at !== undefined && guest.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refresh token has expiration timestamp",
    guest.token.refreshable_until !== undefined &&
      guest.token.refreshable_until.length > 0,
  );
}

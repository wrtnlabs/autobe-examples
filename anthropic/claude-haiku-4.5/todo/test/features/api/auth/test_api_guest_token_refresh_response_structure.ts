import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Test guest token refresh response structure consistency.
 *
 * This test validates that the guest token refresh endpoint returns a response
 * with the exact same structure as the guest join endpoint. Both operations
 * should return an ITodoListGuest.IAuthorized object containing id, email,
 * created_at, updated_at, and a token object with access, refresh, expired_at,
 * and refreshable_until fields.
 *
 * The test flow:
 *
 * 1. Register a new guest account via join endpoint
 * 2. Extract the refresh token from the join response
 * 3. Use the refresh token to get new tokens via refresh endpoint
 * 4. Verify refresh response structure matches join response structure
 * 5. Validate all required fields are present in both responses
 * 6. Ensure token object contains all required JWT and expiration fields
 */
export async function test_api_guest_token_refresh_response_structure(
  connection: api.IConnection,
) {
  // Step 1: Register a new guest account
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = RandomGenerator.alphabets(10);

  const joinResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
        password: guestPassword,
      } satisfies ITodoListGuest.ICreate,
    });

  typia.assert(joinResponse);

  // Validate join response structure
  TestValidator.predicate(
    "join response has id field",
    joinResponse.id !== undefined && joinResponse.id !== null,
  );
  TestValidator.predicate(
    "join response has email field",
    joinResponse.email === guestEmail,
  );
  TestValidator.predicate(
    "join response has created_at field",
    joinResponse.created_at !== undefined && joinResponse.created_at !== null,
  );
  TestValidator.predicate(
    "join response has updated_at field",
    joinResponse.updated_at !== undefined && joinResponse.updated_at !== null,
  );
  TestValidator.predicate(
    "join response has token object",
    joinResponse.token !== undefined && joinResponse.token !== null,
  );
  TestValidator.predicate(
    "join response token has access field",
    joinResponse.token.access !== undefined &&
      joinResponse.token.access !== null,
  );
  TestValidator.predicate(
    "join response token has refresh field",
    joinResponse.token.refresh !== undefined &&
      joinResponse.token.refresh !== null,
  );
  TestValidator.predicate(
    "join response token has expired_at field",
    joinResponse.token.expired_at !== undefined &&
      joinResponse.token.expired_at !== null,
  );
  TestValidator.predicate(
    "join response token has refreshable_until field",
    joinResponse.token.refreshable_until !== undefined &&
      joinResponse.token.refreshable_until !== null,
  );

  // Step 2: Use refresh token to get new tokens
  const refreshResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: joinResponse.token.refresh,
      } satisfies ITodoListGuest.IRefresh,
    });

  typia.assert(refreshResponse);

  // Step 3: Validate refresh response structure
  TestValidator.predicate(
    "refresh response has id field",
    refreshResponse.id !== undefined && refreshResponse.id !== null,
  );
  TestValidator.predicate(
    "refresh response has email field",
    refreshResponse.email === guestEmail,
  );
  TestValidator.predicate(
    "refresh response has created_at field",
    refreshResponse.created_at !== undefined &&
      refreshResponse.created_at !== null,
  );
  TestValidator.predicate(
    "refresh response has updated_at field",
    refreshResponse.updated_at !== undefined &&
      refreshResponse.updated_at !== null,
  );
  TestValidator.predicate(
    "refresh response has token object",
    refreshResponse.token !== undefined && refreshResponse.token !== null,
  );
  TestValidator.predicate(
    "refresh response token has access field",
    refreshResponse.token.access !== undefined &&
      refreshResponse.token.access !== null,
  );
  TestValidator.predicate(
    "refresh response token has refresh field",
    refreshResponse.token.refresh !== undefined &&
      refreshResponse.token.refresh !== null,
  );
  TestValidator.predicate(
    "refresh response token has expired_at field",
    refreshResponse.token.expired_at !== undefined &&
      refreshResponse.token.expired_at !== null,
  );
  TestValidator.predicate(
    "refresh response token has refreshable_until field",
    refreshResponse.token.refreshable_until !== undefined &&
      refreshResponse.token.refreshable_until !== null,
  );

  // Step 4: Compare response structures
  // ID should remain the same (same session)
  TestValidator.equals(
    "refresh response id matches join response id",
    refreshResponse.id,
    joinResponse.id,
  );

  // Email should remain the same
  TestValidator.equals(
    "refresh response email matches join response email",
    refreshResponse.email,
    joinResponse.email,
  );

  // created_at should remain the same (account creation time doesn't change)
  TestValidator.equals(
    "refresh response created_at matches join response created_at",
    refreshResponse.created_at,
    joinResponse.created_at,
  );

  // Token should have new values but same structure
  TestValidator.predicate(
    "refresh token is different from join token",
    refreshResponse.token.access !== joinResponse.token.access,
  );
  TestValidator.predicate(
    "refresh token refresh field is different from join",
    refreshResponse.token.refresh !== joinResponse.token.refresh,
  );

  // Verify token field types are consistent
  TestValidator.predicate(
    "refresh response access token is a string",
    typeof refreshResponse.token.access === "string",
  );
  TestValidator.predicate(
    "refresh response refresh token is a string",
    typeof refreshResponse.token.refresh === "string",
  );
  TestValidator.predicate(
    "refresh response expired_at is a string",
    typeof refreshResponse.token.expired_at === "string",
  );
  TestValidator.predicate(
    "refresh response refreshable_until is a string",
    typeof refreshResponse.token.refreshable_until === "string",
  );
}

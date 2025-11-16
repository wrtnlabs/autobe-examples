import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful guest account creation for temporary read-only access.
 *
 * This test validates that an unauthenticated visitor can register as a guest
 * and receive valid JWT tokens (access and refresh tokens) with proper
 * expiration timestamps. Guest accounts provide immediate read-only access to
 * the discussion board without requiring email verification or password
 * credentials.
 *
 * Test flow:
 *
 * 1. Call the guest registration endpoint /auth/guest/join without authentication
 * 2. Verify the response contains a unique guest session ID (UUID)
 * 3. Verify the response includes valid JWT token structure with all required
 *    fields
 * 4. Validate that access token expiration (expired_at) is a future date-time
 * 5. Validate that refresh token expiration (refreshable_until) is a future
 *    date-time
 * 6. Confirm that expired_at comes before refreshable_until (access expires first)
 * 7. Verify token credentials are properly established for authenticated requests
 */
export async function test_api_guest_authentication_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Register as a guest without authentication
  const guestResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);

  // Step 2: Validate the response type completely (includes all token format validation)
  typia.assert(guestResponse);

  // Step 3: Verify guest session ID is a valid UUID format
  TestValidator.predicate(
    "guest session ID should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestResponse.id,
    ),
  );

  // Step 4: Verify token credentials exist
  TestValidator.predicate(
    "access token should not be empty",
    guestResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should not be empty",
    guestResponse.token.refresh.length > 0,
  );

  // Step 5: Verify expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(guestResponse.token.expired_at);
  const refreshableUntil = new Date(guestResponse.token.refreshable_until);

  TestValidator.predicate(
    "access token should expire in the future",
    expiredAt > now,
  );

  TestValidator.predicate(
    "refresh token should expire in the future",
    refreshableUntil > now,
  );

  // Step 6: Verify access token expires before refresh token
  TestValidator.predicate(
    "access token expiration should come before refresh token expiration",
    expiredAt < refreshableUntil,
  );

  // Step 7: Verify authorization header was set for authenticated requests
  TestValidator.predicate(
    "connection authorization header should be set with access token",
    connection.headers?.Authorization === guestResponse.token.access,
  );
}

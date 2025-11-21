import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * Test the creation of a new guest session for anonymous platform access.
 *
 * This test validates that the guest join endpoint generates a
 * cryptographically secure session token, creates proper timestamps, and
 * returns complete authentication information including JWT tokens. The test
 * verifies that guest sessions allow browsing public content without requiring
 * personal information or formal registration.
 *
 * The API should automatically generate session tokens and create guest session
 * records with appropriate timestamps. The response should include unique
 * identifiers, timestamps, and authentication tokens that enable anonymous
 * users to browse public content with limited permissions.
 */
export async function test_api_guest_session_creation(
  connection: api.IConnection,
) {
  // Create a guest session with empty request body
  const guestSession: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        session_token: undefined,
      } satisfies ICommunityPlatformGuest.ICreate,
    });

  // Validate the response structure using typia - this performs complete validation
  typia.assert(guestSession);

  // Verify that the session token is a non-empty string
  TestValidator.predicate(
    "session_token is non-empty string",
    guestSession.session_token.length > 0,
  );

  // Verify that JWT tokens are non-empty strings
  TestValidator.predicate(
    "access token is non-empty string",
    guestSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    guestSession.token.refresh.length > 0,
  );

  // Verify that timestamps are properly set (created_at should be before or equal to updated_at)
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    new Date(guestSession.created_at) <= new Date(guestSession.updated_at),
  );

  // Verify that token expiration dates are in the future
  TestValidator.predicate(
    "token expired_at is in the future",
    new Date(guestSession.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "token refreshable_until is in the future",
    new Date(guestSession.token.refreshable_until) > new Date(),
  );

  // Verify that refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(guestSession.token.refreshable_until) >
      new Date(guestSession.token.expired_at),
  );
}

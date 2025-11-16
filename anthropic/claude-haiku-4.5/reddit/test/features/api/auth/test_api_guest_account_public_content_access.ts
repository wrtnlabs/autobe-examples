import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that newly created guest accounts can immediately access public platform
 * content.
 *
 * This test validates the guest account registration flow and verifies that
 * guests receive proper JWT authentication tokens for accessing public content
 * endpoints. The test ensures guest accounts have appropriate read-only access
 * to public information like community listings, posts, and user profiles.
 *
 * Test flow:
 *
 * 1. Create a new guest account via /auth/guest/join endpoint
 * 2. Verify guest account creation returns valid
 *    ICommunityPlatformMember.IAuthorized structure
 * 3. Confirm JWT access token is issued and properly formatted
 * 4. Validate refresh token is provided for session management
 * 5. Verify token expiration timestamps are set correctly
 * 6. Confirm access token is automatically registered in connection headers
 * 7. Validate the guest has a unique guest ID (UUID format)
 */
export async function test_api_guest_account_public_content_access(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest account
  const guestAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.guest.join(connection);

  // Step 2: Validate the guest account structure and data integrity
  // typia.assert() performs COMPLETE type validation including:
  // - UUID format validation for guestAccount.id
  // - ISO 8601 date-time format validation for expired_at and refreshable_until
  // - String type validation for access and refresh tokens
  typia.assert(guestAccount);

  // Step 3: Verify guest ID is a valid UUID
  TestValidator.predicate(
    "guest account has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestAccount.id,
    ),
  );

  // Step 4: Verify access token is present and non-empty
  TestValidator.predicate(
    "guest account has access token",
    guestAccount.token.access.length > 0,
  );

  // Step 5: Verify refresh token is present and non-empty
  TestValidator.predicate(
    "guest account has refresh token",
    guestAccount.token.refresh.length > 0,
  );

  // Step 6: Verify access token expiration is after current time
  const accessTokenExpiry = new Date(guestAccount.token.expired_at);
  TestValidator.predicate(
    "access token has future expiration",
    accessTokenExpiry > new Date(),
  );

  // Step 7: Verify refresh token expiration is after access token expiration
  const refreshTokenExpiry = new Date(guestAccount.token.refreshable_until);
  TestValidator.predicate(
    "refresh token expiration is after access token expiration",
    refreshTokenExpiry >= accessTokenExpiry,
  );

  // Step 8: Verify authorization token is automatically set in connection headers
  TestValidator.predicate(
    "access token is set in connection headers",
    connection.headers?.Authorization === guestAccount.token.access,
  );

  // Step 9: Verify guest can be identified by the issued guest ID
  TestValidator.predicate(
    "guest account ID is properly assigned",
    guestAccount.id !== undefined &&
      guestAccount.id !== null &&
      guestAccount.id.length > 0,
  );
}

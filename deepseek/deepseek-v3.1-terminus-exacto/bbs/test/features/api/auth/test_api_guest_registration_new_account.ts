import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest registration workflow for creating a new temporary guest account.
 *
 * This test validates that anonymous users can successfully create guest
 * accounts without authentication requirements. It verifies that a unique
 * guest_token is generated and returned in the response. The test ensures that
 * the guest record is properly created with appropriate timestamps (created_at,
 * updated_at). The response should include valid JWT tokens with proper
 * expiration times for subsequent authenticated API calls. This test ensures
 * the guest management workflow supports anonymous browsing while maintaining
 * platform security.
 */
export async function test_api_guest_registration_new_account(
  connection: api.IConnection,
) {
  // Call the guest join API endpoint to create a new temporary guest account
  const guestAccount: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);

  // Validate the response structure using typia.assert - this performs COMPLETE validation
  typia.assert(guestAccount);

  // Verify that created_at and updated_at are the same for a new record (business logic)
  TestValidator.equals(
    "created_at and updated_at should be equal for new guest account",
    guestAccount.created_at,
    guestAccount.updated_at,
  );

  // Verify that refreshable_until is after expired_at (business logic validation)
  const expiredAt = new Date(guestAccount.token.expired_at);
  const refreshableUntil = new Date(guestAccount.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableUntil > expiredAt,
  );
}

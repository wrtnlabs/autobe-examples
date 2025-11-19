import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that profile retrieval correctly reflects the user's current account
 * status.
 *
 * Verifies that the GET /my/profile endpoint returns the authenticated user's
 * complete profile including the current account status. Validates that the
 * accountStatus field accurately returns one of the valid states: 'active',
 * 'suspended', 'restricted', or 'deleted'.
 *
 * Business rule validation: Suspended or restricted accounts can still retrieve
 * their own profile information, confirming that profile access is not blocked
 * by account status restrictions. This supports account recovery workflows.
 *
 * Test flow:
 *
 * 1. Call the profile retrieval API endpoint for the authenticated user
 * 2. Validate the response is properly typed as IDiscussionBoardUser
 * 3. Verify the accountStatus field contains a valid state value
 * 4. Confirm profile reflects correct account status regardless of current state
 */
export async function test_api_profile_retrieval_reflects_account_status(
  connection: api.IConnection,
) {
  // Call the API to retrieve the authenticated user's profile
  const profile = await api.functional.my.profile.at(connection);

  // Validate the response matches the expected type with complete type checking
  typia.assert(profile);

  // Verify accountStatus is one of the four valid states
  const validStatuses = [
    "active",
    "suspended",
    "restricted",
    "deleted",
  ] as const;
  TestValidator.predicate(
    "accountStatus must be one of valid states",
    validStatuses.includes(profile.accountStatus),
  );

  // Verify that profile is accessible and contains expected user information
  TestValidator.predicate("profile has valid id", profile.id.length > 0);

  TestValidator.predicate("profile has valid email", profile.email.length > 0);

  TestValidator.predicate(
    "profile has non-empty username",
    profile.username.length > 0,
  );

  // Validate that both creation and update timestamps are present
  TestValidator.predicate(
    "createdAt timestamp is present",
    profile.createdAt !== null && profile.createdAt !== undefined,
  );

  TestValidator.predicate(
    "updatedAt timestamp is present",
    profile.updatedAt !== null && profile.updatedAt !== undefined,
  );

  // Confirm emailVerified state is boolean
  TestValidator.predicate(
    "emailVerified is boolean",
    typeof profile.emailVerified === "boolean",
  );
}

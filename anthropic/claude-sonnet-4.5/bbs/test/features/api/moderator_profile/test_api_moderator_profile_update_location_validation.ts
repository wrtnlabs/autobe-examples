import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Tests that the location field accepts valid values within the 100 character
 * limit.
 *
 * This test validates that moderator profile location updates work correctly
 * with valid location strings. It authenticates as a moderator and verifies
 * that locations at exactly 100 characters and under 100 characters are
 * accepted and saved correctly. This ensures the location field handles valid
 * data properly within its constraints.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Update location with exactly 100 characters (should succeed)
 * 3. Verify the location was saved correctly
 * 4. Update location with <100 characters (should succeed)
 * 5. Verify the updated location was saved correctly
 */
export async function test_api_moderator_profile_update_location_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderatorEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://test.example.com/join",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Update location with exactly 100 characters (should succeed)
  const exactLengthLocation = RandomGenerator.alphabets(100);

  const updatedWithExact: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: moderator.username,
        body: {
          location: exactLengthLocation,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedWithExact);

  // Step 3: Verify the location was saved correctly
  TestValidator.equals(
    "exact 100 character location should be saved",
    updatedWithExact.location,
    exactLengthLocation,
  );

  // Step 4: Update location with <100 characters (should succeed)
  const validLocation = RandomGenerator.alphabets(50);

  const updatedWithValid: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: moderator.username,
        body: {
          location: validLocation,
        } satisfies IDiscussionBoardModerator.IUpdate,
      },
    );
  typia.assert(updatedWithValid);

  // Step 5: Verify the updated location was saved correctly
  TestValidator.equals(
    "valid location under 100 characters should be saved",
    updatedWithValid.location,
    validLocation,
  );
}

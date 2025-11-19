import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that newly created moderator accounts have accountStatus set to
 * 'active'.
 *
 * This test validates the proper initialization of moderator accounts by:
 *
 * 1. Creating a new moderator account with valid credentials (email, password,
 *    username)
 * 2. Immediately retrieving the moderator's profile using the authenticated
 *    connection
 * 3. Verifying that the account_status field is set to 'active'
 * 4. Confirming that moderation tier is set to 'full'
 *
 * This ensures that newly registered moderators have immediate access to
 * perform moderation duties without requiring manual account activation or
 * additional verification.
 */
export async function test_api_moderator_profile_account_status_active(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with valid credentials
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(3) +
    RandomGenerator.alphabets(3).toUpperCase() +
    RandomGenerator.alphaNumeric(2);
  const moderatorUsername = RandomGenerator.alphabets(5);

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // Validate the response from moderator creation
  typia.assert(createdModerator);

  // Step 2: Retrieve the moderator's profile immediately after registration
  const profile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.at(connection);

  // Validate the profile response
  typia.assert(profile);

  // Step 3: Verify that account_status is set to 'active'
  TestValidator.equals(
    "moderator account status should be active",
    profile.accountStatus,
    "active",
  );

  // Step 4: Verify additional account properties for complete initialization
  TestValidator.equals(
    "moderator email should match registered email",
    profile.email,
    moderatorEmail,
  );

  TestValidator.equals(
    "moderator username should match registered username",
    profile.username,
    moderatorUsername,
  );

  TestValidator.equals(
    "moderator tier should be full",
    profile.moderationTier,
    "full",
  );

  TestValidator.predicate(
    "moderator should be created with valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
}

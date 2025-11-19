import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test profile retrieval after email verification is completed.
 *
 * This test simulates a moderator who has registered and then retrieves their
 * profile to verify that the emailVerified field correctly reflects the account
 * verification state. The test validates that profile data accurately
 * represents authentication and account status information.
 *
 * Workflow:
 *
 * 1. Create a new moderator account with email, password, and username
 * 2. Verify the join response includes authentication token and moderator details
 * 3. Retrieve the moderator's profile using the authenticated connection
 * 4. Validate profile response contains accurate account information
 * 5. Confirm emailVerified field reflects the initial unverified state (false)
 * 6. Verify other profile fields are correctly populated
 * 7. Ensure authentication token is properly stored in connection headers
 */
export async function test_api_moderator_profile_retrieval_after_email_verification(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphabets(10);

  const createResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(createResponse);

  // Step 2: Verify the join response contains expected moderator details
  TestValidator.equals(
    "created moderator email matches input",
    createResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "created moderator username matches input",
    createResponse.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "created moderator account status is active",
    createResponse.account_status,
    "active",
  );
  TestValidator.equals(
    "created moderator moderation tier is full",
    createResponse.moderation_tier,
    "full",
  );
  TestValidator.predicate(
    "email is not verified after registration",
    createResponse.email_verified === false,
  );

  // Step 3: Retrieve the moderator's profile using authenticated connection
  // The connection now has the authentication token from the join response
  const profileResponse: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(profileResponse);

  // Step 4 & 5: Validate profile response with focus on verification state
  TestValidator.equals(
    "profile email matches created email",
    profileResponse.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "profile username matches created username",
    profileResponse.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "profile account status is active",
    profileResponse.accountStatus,
    "active",
  );
  TestValidator.predicate(
    "profile shows email is not verified",
    profileResponse.emailVerified === false,
  );

  // Step 6: Verify moderator-specific profile fields
  TestValidator.predicate(
    "profile has moderation tier",
    profileResponse.moderationTier !== null &&
      profileResponse.moderationTier !== undefined,
  );

  // Step 7: Verify timestamps are present
  TestValidator.predicate(
    "profile has created timestamp",
    profileResponse.createdAt !== null &&
      profileResponse.createdAt !== undefined &&
      profileResponse.createdAt.length > 0,
  );
  TestValidator.predicate(
    "profile has updated timestamp",
    profileResponse.updatedAt !== null &&
      profileResponse.updatedAt !== undefined &&
      profileResponse.updatedAt.length > 0,
  );
}

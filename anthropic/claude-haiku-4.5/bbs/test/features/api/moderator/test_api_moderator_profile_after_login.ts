import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Tests the moderator profile retrieval after successful login.
 *
 * This test validates the complete moderator authentication workflow:
 *
 * 1. Register a new moderator account with email, password, and username
 * 2. Authenticate using login endpoint with email/password credentials
 * 3. Retrieve the authenticated moderator's profile
 * 4. Verify that lastLoginAt timestamp has been updated to reflect the recent
 *    login
 *
 * The test ensures that the access token obtained during login is properly used
 * for authenticated API calls, and that the server correctly tracks login
 * activity by updating the lastLoginAt field.
 */
export async function test_api_moderator_profile_after_login(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPass123!";
  const moderatorUsername = RandomGenerator.alphabets(10);

  const joinedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(joinedModerator);

  // Verify moderator was created with correct properties
  TestValidator.equals(
    "moderator email matches registered email",
    joinedModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches registered username",
    joinedModerator.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "moderator account is active",
    joinedModerator.account_status === "active",
  );
  TestValidator.equals(
    "moderator has full moderation tier",
    joinedModerator.moderation_tier,
    "full",
  );

  // Step 2: Login with the moderator credentials
  const loginResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(loginResponse);

  // Verify login response contains valid tokens
  TestValidator.predicate(
    "access token is present",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loginResponse.token.refresh.length > 0,
  );

  // Step 3: Retrieve the authenticated moderator's profile
  const profile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(profile);

  // Step 4: Verify profile information
  TestValidator.equals(
    "profile email matches moderator email",
    profile.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "profile username matches moderator username",
    profile.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "profile account is active",
    profile.accountStatus === "active",
  );
  TestValidator.predicate(
    "profile has full moderation tier",
    profile.moderationTier === "full",
  );

  // Verify lastLoginAt has been updated after login
  TestValidator.predicate(
    "lastLoginAt is not null after login",
    profile.lastLoginAt !== null && profile.lastLoginAt !== undefined,
  );

  // Verify the lastLoginAt timestamp is recent (within reasonable time)
  if (profile.lastLoginAt) {
    const lastLoginDate = new Date(profile.lastLoginAt);
    const currentDate = new Date();
    const timeDifferenceMs = currentDate.getTime() - lastLoginDate.getTime();
    const oneMinuteMs = 60 * 1000;

    TestValidator.predicate(
      "lastLoginAt is recent (within 1 minute)",
      timeDifferenceMs >= 0 && timeDifferenceMs <= oneMinuteMs,
    );
  }
}

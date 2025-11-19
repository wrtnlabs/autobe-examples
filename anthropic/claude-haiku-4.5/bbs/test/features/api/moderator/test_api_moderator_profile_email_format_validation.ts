import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that moderator profile response includes email address in valid RFC 5321
 * format.
 *
 * This test validates the complete workflow:
 *
 * 1. Register a new moderator account with a valid email address
 * 2. Retrieve the moderator's profile information
 * 3. Verify that the email field in the profile matches the registration input
 * 4. Confirm that the email follows valid email format standards (RFC 5321)
 * 5. Validate that the email is properly stored and returned in the response
 *
 * Business context:
 *
 * - Email is a critical identifier for moderator accounts
 * - Email format validation ensures system reliability
 * - Profile retrieval must return accurate account information
 * - Email should match exactly what was registered
 */
export async function test_api_moderator_profile_email_format_validation(
  connection: api.IConnection,
) {
  // Step 1: Generate valid moderator registration data
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(8);

  // Step 2: Register moderator with valid email
  const registrationResponse = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(registrationResponse);

  // Validate registration response structure and email
  TestValidator.equals(
    "registered moderator email matches input",
    registrationResponse.email,
    moderatorEmail,
  );
  TestValidator.predicate(
    "registration response contains valid email format",
    registrationResponse.email.includes("@"),
  );

  // Step 3: Retrieve moderator profile
  const profileResponse =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(profileResponse);

  // Step 4: Validate profile email format and correctness
  TestValidator.equals(
    "profile email matches registered email",
    profileResponse.email,
    moderatorEmail,
  );
  TestValidator.predicate(
    "profile email contains valid email structure",
    profileResponse.email.includes("@") && profileResponse.email.includes("."),
  );

  // Step 5: Validate email consistency across registration and profile
  TestValidator.equals(
    "email is consistent between registration and profile response",
    registrationResponse.email,
    profileResponse.email,
  );

  // Step 6: Validate that profile contains expected moderator properties
  TestValidator.predicate(
    "profile username matches registered username",
    profileResponse.username === moderatorUsername,
  );
  TestValidator.predicate(
    "profile has valid account status",
    ["active", "suspended", "restricted", "deleted"].includes(
      profileResponse.accountStatus,
    ),
  );
}

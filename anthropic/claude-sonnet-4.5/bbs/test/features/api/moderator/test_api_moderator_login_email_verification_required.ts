import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderators must have verified emails to exercise privileges.
 *
 * This test validates the email verification workflow for moderators:
 *
 * 1. Creates a moderator account (which starts with email_verified=false)
 * 2. Logs in with valid credentials to verify authentication succeeds
 * 3. Confirms that the response indicates unverified status (email_verified=false)
 * 4. Validates that email_verified_at is null until verification is completed
 *
 * This ensures the system correctly tracks email verification status, allowing
 * privilege restrictions to be enforced based on the email_verified flag.
 */
export async function test_api_moderator_login_email_verification_required(
  connection: api.IConnection,
) {
  // Step 1: Create an unverified moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const baseHref = "https://example.com/moderator/join";
  const baseReferrer = "https://example.com/";

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<20>
        >(),
        display_name: RandomGenerator.name(),
        href: baseHref,
        referrer: baseReferrer,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(createdModerator);

  // Verify the created moderator has email_verified=false
  TestValidator.equals(
    "newly created moderator email should not be verified",
    createdModerator.email_verified,
    false,
  );

  // Step 2: Login with the same credentials
  const loggedInModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/moderator/login",
        referrer: "https://example.com/moderator/join",
      } satisfies IDiscussionBoardModerator.ILogin,
    });

  typia.assert(loggedInModerator);

  // Step 3: Verify authentication succeeded and tokens are returned
  TestValidator.predicate(
    "login should return access token",
    typeof loggedInModerator.token.access === "string" &&
      loggedInModerator.token.access.length > 0,
  );

  TestValidator.predicate(
    "login should return refresh token",
    typeof loggedInModerator.token.refresh === "string" &&
      loggedInModerator.token.refresh.length > 0,
  );

  // Step 4: Validate that email_verified is false in the login response
  TestValidator.equals(
    "logged in moderator email_verified should be false",
    loggedInModerator.email_verified,
    false,
  );

  // Step 5: Verify email_verified_at is null/undefined
  TestValidator.predicate(
    "email_verified_at should be null or undefined for unverified moderator",
    loggedInModerator.email_verified_at === null ||
      loggedInModerator.email_verified_at === undefined,
  );

  // Step 6: Confirm the moderator IDs match
  TestValidator.equals(
    "logged in moderator should have same ID as created moderator",
    loggedInModerator.id,
    createdModerator.id,
  );
}

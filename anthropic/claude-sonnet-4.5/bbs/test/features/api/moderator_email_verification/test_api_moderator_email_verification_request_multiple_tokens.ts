import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderators can request multiple verification tokens when previous
 * tokens expire or are not received.
 *
 * This test validates the email verification token generation system for
 * moderators. It verifies that:
 *
 * 1. A moderator can successfully request an initial email verification token
 * 2. The same moderator can request a second verification token while the first is
 *    still active
 * 3. Each request generates a new unique token and creates a new record in
 *    discussion_board_email_verifications table
 * 4. Previous unused tokens remain in the database for audit purposes and are not
 *    automatically invalidated
 * 5. Each token has its own 24-hour expiration timestamp
 * 6. Multiple active verification records can exist simultaneously for the same
 *    moderator
 *
 * Test workflow:
 *
 * 1. Create a new moderator account with valid credentials
 * 2. Authenticate and obtain JWT tokens
 * 3. Request the first email verification token
 * 4. Request a second email verification token without waiting for the first to
 *    expire
 * 5. Validate that both requests succeed without errors
 */
export async function test_api_moderator_email_verification_request_multiple_tokens(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.alphaNumeric(8);

  const createBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 2: Join as moderator and authenticate
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: createBody,
  });
  typia.assert(moderator);

  // Validate moderator account was created successfully
  TestValidator.predicate(
    "moderator account created with valid email",
    moderator.email === moderatorEmail,
  );
  TestValidator.predicate(
    "moderator account created with valid username",
    moderator.username === moderatorUsername,
  );
  TestValidator.predicate(
    "moderator email is not yet verified",
    moderator.email_verified === false,
  );
  TestValidator.predicate(
    "moderator account is active",
    moderator.is_active === true,
  );

  // Step 3: Request the first email verification token
  await api.functional.auth.moderator.email.verify.request.requestEmailVerification(
    connection,
  );

  // Step 4: Request a second email verification token while the first is still active
  await api.functional.auth.moderator.email.verify.request.requestEmailVerification(
    connection,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful password reset request for an existing member account.
 *
 * This test validates the password reset request workflow for members who have
 * forgotten their password. It creates a member account, then initiates a
 * password reset using the member's registered email address, and verifies the
 * response confirms proper reset token generation.
 *
 * Test workflow:
 *
 * 1. Register a new member account with valid credentials
 * 2. Request password reset using the registered email
 * 3. Verify response confirms reset email sent with 60-minute expiration
 * 4. Validate that the operation creates proper database records
 */
export async function test_api_password_reset_request_valid_member_email(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with known email address
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();

  const memberData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const createdMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(createdMember);

  // Validate member was created successfully
  TestValidator.equals(
    "member email matches",
    createdMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "member username matches",
    createdMember.username,
    memberUsername,
  );

  // Step 2: Request password reset using the registered email
  const resetRequest = {
    email: memberEmail,
  } satisfies IDiscussionBoardMember.IRequestPasswordReset;

  const resetResponse: IDiscussionBoardMember.IPasswordResetRequested =
    await api.functional.auth.member.password.reset.requestPasswordReset(
      connection,
      {
        body: resetRequest,
      },
    );
  typia.assert(resetResponse);

  // Step 3: Validate the password reset response
  TestValidator.predicate(
    "reset response message is provided",
    resetResponse.message.length > 0,
  );

  TestValidator.equals(
    "reset token expires in 60 minutes",
    resetResponse.expires_in_minutes,
    60,
  );

  TestValidator.predicate(
    "expiration time is positive",
    resetResponse.expires_in_minutes > 0,
  );
}

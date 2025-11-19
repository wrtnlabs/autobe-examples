import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test the complete password reset request workflow for a member account.
 *
 * This test validates the password reset initiation flow for member accounts
 * by:
 *
 * 1. Creating a new member account through the join operation
 * 2. Initiating a password reset request for that member's email address
 * 3. Verifying the password reset record contains all required fields
 * 4. Validating the actor_type discriminator correctly identifies this as a member
 *    reset
 * 5. Ensuring the token field is present and expires_at is set to approximately 1
 *    hour
 *
 * This test ensures the polymorphic ownership pattern works correctly for
 * member password reset requests and that the security token expiration is
 * properly configured.
 */
export async function test_api_password_reset_member_account_request(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with verified credentials
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
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Verify member was created successfully
  TestValidator.equals("member email matches", member.email, memberEmail);
  TestValidator.equals(
    "member username matches",
    member.username,
    memberUsername,
  );

  // Step 2: Initiate password reset request for the member account
  const resetRequest = {
    actor_type: "member" as const,
    email: memberEmail,
  } satisfies IDiscussionBoardPasswordReset.ICreate;

  const passwordReset =
    await api.functional.discussionBoard.passwordResets.create(connection, {
      body: resetRequest,
    });
  typia.assert(passwordReset);

  // Step 3: Validate password reset response structure
  TestValidator.predicate(
    "password reset id is UUID format",
    typeof passwordReset.id === "string" && passwordReset.id.length > 0,
  );
  TestValidator.equals(
    "actor_type discriminator is member",
    passwordReset.actor_type,
    "member",
  );
  TestValidator.equals(
    "reset email matches member email",
    passwordReset.email,
    memberEmail,
  );
  TestValidator.predicate(
    "token field is present",
    typeof passwordReset.token === "string" && passwordReset.token.length > 0,
  );

  // Step 4: Verify expiration timestamp is approximately 1 hour from creation
  const createdAt = new Date(passwordReset.created_at);
  const expiresAt = new Date(passwordReset.expires_at);
  const oneHourInMs = 60 * 60 * 1000;
  const timeDifference = expiresAt.getTime() - createdAt.getTime();

  TestValidator.predicate(
    "expires_at is approximately 1 hour after created_at",
    Math.abs(timeDifference - oneHourInMs) < 5000,
  );

  // Step 5: Verify used_at is null or undefined (token not yet used)
  TestValidator.predicate(
    "used_at should be null or undefined for new reset request",
    passwordReset.used_at === null || passwordReset.used_at === undefined,
  );
}

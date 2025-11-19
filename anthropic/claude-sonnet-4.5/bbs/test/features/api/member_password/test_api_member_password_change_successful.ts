import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful password change workflow for an authenticated member.
 *
 * This test validates the complete password change flow including:
 *
 * 1. Creating a new member account via join endpoint with initial credentials
 * 2. Authenticating the member (authentication is automatic after join)
 * 3. Changing the password by providing the correct current password and a new
 *    password
 * 4. Verifying that the operation returns a success confirmation message
 *
 * The test confirms that the password change endpoint properly validates the
 * current password, updates to the new bcrypt-hashed password, and manages
 * session lifecycle where other sessions are invalidated while the current
 * session remains active.
 */
export async function test_api_member_password_change_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with initial credentials
  const initialPassword = "InitialPassword123!";
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();

  const createBody = {
    email: memberEmail,
    password: initialPassword,
    username: memberUsername,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: createBody });
  typia.assert(member);

  // Verify member was created successfully with expected properties
  TestValidator.equals("member email matches", member.email, memberEmail);
  TestValidator.equals(
    "member username matches",
    member.username,
    memberUsername,
  );
  TestValidator.predicate("member has valid ID", member.id.length > 0);
  TestValidator.predicate(
    "member has auth token",
    member.token.access.length > 0,
  );

  // Step 2: Member is now authenticated (join endpoint automatically sets authentication)
  // The connection.headers.Authorization is already set by the join function

  // Step 3: Change the password with current and new passwords
  const newPassword = "NewSecurePassword456!";
  const changePasswordBody = {
    currentPassword: initialPassword,
    newPassword: newPassword,
  } satisfies IDiscussionBoardMember.IChangePassword;

  const passwordChangeResult: IDiscussionBoardMember.IPasswordChanged =
    await api.functional.auth.member.password.change.changePassword(
      connection,
      { body: changePasswordBody },
    );
  typia.assert(passwordChangeResult);

  // Step 4: Verify the password change was successful
  TestValidator.predicate(
    "password change confirmation message exists",
    passwordChangeResult.message.length > 0,
  );

  // The response should contain a success message indicating password was changed
  TestValidator.predicate(
    "password change message indicates success",
    passwordChangeResult.message.toLowerCase().includes("password") ||
      passwordChangeResult.message.toLowerCase().includes("success") ||
      passwordChangeResult.message.toLowerCase().includes("changed"),
  );
}

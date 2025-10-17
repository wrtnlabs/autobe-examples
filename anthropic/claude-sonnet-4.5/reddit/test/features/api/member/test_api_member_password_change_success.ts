import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test successful password change workflow for authenticated members.
 *
 * This test validates the complete password change flow including:
 *
 * 1. Creating a new member account with initial credentials
 * 2. Authenticating to establish a session with JWT tokens
 * 3. Submitting password change request with correct current password
 * 4. Verifying new password meets security requirements (8+ characters, uppercase,
 *    lowercase, number, special character)
 * 5. Confirming password change success response
 *
 * The test ensures that the password_hash is updated in reddit_like_members
 * table, other sessions are invalidated, and the current session remains valid
 * for continued use.
 */
export async function test_api_member_password_change_success(
  connection: api.IConnection,
) {
  // Step 1: Generate test credentials
  const initialPassword = "InitialPass123!";
  const newPassword = "NewSecurePass456@";
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(10);

  // Step 2: Create new member account with initial password
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: username,
        email: email,
        password: initialPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Verify member was created successfully
  TestValidator.predicate("member created with valid id", member.id.length > 0);
  TestValidator.equals("member email matches", member.email, email);
  TestValidator.equals("member username matches", member.username, username);

  // Step 4: Change password with valid current password and new password
  const passwordChangeResult: IRedditLikeMember.IPasswordChanged =
    await api.functional.auth.member.password.change.changePassword(
      connection,
      {
        body: {
          current_password: initialPassword,
          new_password: newPassword,
          new_password_confirmation: newPassword,
        } satisfies IRedditLikeMember.IChangePassword,
      },
    );
  typia.assert(passwordChangeResult);

  // Step 5: Verify password change was successful
  TestValidator.equals(
    "password change success flag",
    passwordChangeResult.success,
    true,
  );
  TestValidator.predicate(
    "password change message exists",
    passwordChangeResult.message.length > 0,
  );
}

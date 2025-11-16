import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member login failure with incorrect password.
 *
 * This test validates the authentication system's password verification
 * security. It ensures that login attempts with valid email but incorrect
 * password are properly rejected, preventing unauthorized access to member
 * accounts.
 *
 * Test workflow:
 *
 * 1. Register a new member account with known email and password
 * 2. Attempt to login using the correct email but incorrect password
 * 3. Verify that the authentication system rejects the login attempt
 * 4. Confirm that no authentication tokens are issued for invalid credentials
 */
export async function test_api_member_login_incorrect_password(
  connection: api.IConnection,
) {
  // Step 1: Register a member account with known credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = "correctPassword123";
  const incorrectPassword = "wrongPassword456";

  const registrationData = {
    email: memberEmail,
    password: correctPassword,
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredMember);

  // Step 2: Attempt login with correct email but incorrect password
  // Step 3: Verify that the login attempt is rejected
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: incorrectPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}

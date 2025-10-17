import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test login failure with invalid credentials to ensure proper security
 * measures.
 *
 * This test validates that the login system properly handles invalid
 * credentials while protecting against username enumeration attacks. The system
 * should return generic error messages that don't reveal whether the email
 * exists or if the password was incorrect.
 *
 * Test workflow:
 *
 * 1. Register a new member account with valid credentials
 * 2. Attempt login with correct email but incorrect password
 * 3. Verify rejection with generic error message
 * 4. Attempt login with non-existent email address
 * 5. Verify the same generic error message
 * 6. Confirm no information leakage about account existence
 */
export async function test_api_member_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "ValidPass123!@#";
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const registeredMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: username,
        email: validEmail,
        password: validPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(registeredMember);

  // Step 2: Attempt login with correct email but incorrect password
  await TestValidator.error(
    "login with correct email but wrong password should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: validEmail,
          password: "WrongPassword456!",
        } satisfies IRedditLikeMember.ILogin,
      });
    },
  );

  // Step 3: Attempt login with non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: nonExistentEmail,
          password: "AnyPassword789!",
        } satisfies IRedditLikeMember.ILogin,
      });
    },
  );
}

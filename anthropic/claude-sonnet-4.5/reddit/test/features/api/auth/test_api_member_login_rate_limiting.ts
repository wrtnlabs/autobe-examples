import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

export async function test_api_member_login_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account with valid credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "SecurePass123!";
  const testUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const registeredMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: testUsername,
        email: testEmail,
        password: testPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(registeredMember);

  // Create a fresh connection without authentication headers for login attempts
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 2: Attempt login with incorrect password 5 times consecutively
  const incorrectPassword = "WrongPassword999!";
  const failedAttempts = 5;

  for (let i = 0; i < failedAttempts; i++) {
    await TestValidator.error(
      `failed login attempt ${i + 1} should be rejected`,
      async () => {
        await api.functional.auth.member.login(unauthConn, {
          body: {
            email: testEmail,
            password: incorrectPassword,
          } satisfies IRedditLikeMember.ILogin,
        });
      },
    );
  }

  // Step 3 & 4: After the 5th failed attempt, account should be locked
  // Attempt the 6th login with incorrect password - should fail due to account lock
  await TestValidator.error(
    "6th failed login attempt should be denied due to account lock",
    async () => {
      await api.functional.auth.member.login(unauthConn, {
        body: {
          email: testEmail,
          password: incorrectPassword,
        } satisfies IRedditLikeMember.ILogin,
      });
    },
  );

  // Step 5: Verify that even correct credentials are rejected during lockout
  await TestValidator.error(
    "login with correct credentials should fail during lockout period",
    async () => {
      await api.functional.auth.member.login(unauthConn, {
        body: {
          email: testEmail,
          password: testPassword,
        } satisfies IRedditLikeMember.ILogin,
      });
    },
  );
}

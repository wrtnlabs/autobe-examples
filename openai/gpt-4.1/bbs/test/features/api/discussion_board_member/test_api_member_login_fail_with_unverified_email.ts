import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that login fails for a newly registered member whose email has not been
 * verified yet, even if correct credentials are provided.
 *
 * This scenario verifies that the system enforces email verification by
 * blocking login (and, by extension, all posting/interacting) until the
 * registration/verification flow is complete. Even with valid credentials,
 * login must fail if email_verified is false on the member record.
 *
 * Steps:
 *
 * 1. Register a new member (random valid email, unique username, password meeting
 *    policy)
 * 2. Attempt login immediately with the same credentials
 * 3. Assert that the login attempt fails due to unverified email
 *    (TestValidator.error)
 * 4. (No further steps: the test is about the restriction, not the full
 *    registration/verification/posting flow)
 */
export async function test_api_member_login_fail_with_unverified_email(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(10);

  const registerBody = {
    email,
    username,
    password: password satisfies string as string,
  } satisfies IDiscussionBoardMember.ICreate;

  const registered = await api.functional.auth.member.join(connection, {
    body: registerBody,
  });
  typia.assert(registered);
  TestValidator.equals(
    "email_verified should be false after registration",
    registered.email_verified,
    false,
  );

  // 2. Attempt login immediately (should fail)
  const loginBody = {
    email,
    password,
  } satisfies IDiscussionBoardMember.ILogin;

  await TestValidator.error(
    "login should fail when email is not verified",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: loginBody,
      });
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate that login fails with wrong password for an existing member account.
 *
 * 1. Register a new member account with a random email, username, and password.
 * 2. Attempt to login with the same email but a wrong password.
 * 3. Assert that the API throws an error (expected), and does not return a token
 *    or leak email existence info.
 */
export async function test_api_member_login_fail_with_wrong_password(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const username = RandomGenerator.name();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        username,
        password: password as string & tags.Format<"password">,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Attempt to login with correct email but wrong password
  await TestValidator.error(
    "login should fail for correct email and wrong password",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email,
          password: RandomGenerator.alphaNumeric(12) as string &
            tags.MinLength<8>, // random wrong password
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}

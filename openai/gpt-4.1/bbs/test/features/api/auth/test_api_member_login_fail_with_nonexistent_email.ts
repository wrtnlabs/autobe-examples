import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate failed login with a non-existent email.
 *
 * - Attempts to login as a member (via /auth/member/login) using a random,
 *   never-registered email and a valid password.
 * - Asserts that login fails (the API throws an error).
 * - Ensures the error does not leak whether the email was ever registered.
 * - Optionally, repeat multiple times with different random emails and password
 *   values.
 */
export async function test_api_member_login_fail_with_nonexistent_email(
  connection: api.IConnection,
) {
  // Attempt to login with a random non-existent email
  const fakeEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // Password must satisfy min-length:8
  const fakePassword: string & tags.MinLength<8> = typia.random<
    string & tags.MinLength<8>
  >();

  await TestValidator.error(
    "login with nonexistent email should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: fakeEmail,
          password: fakePassword,
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );

  // Optional: Repeat a few more times with different random fake emails/passwords
  await ArrayUtil.asyncForEach(
    ArrayUtil.repeat(2, () => undefined),
    async () => {
      const randomEmail = typia.random<string & tags.Format<"email">>();
      const randomPassword = typia.random<string & tags.MinLength<8>>();
      await TestValidator.error(
        "login with another nonexistent email fails",
        async () => {
          await api.functional.auth.member.login(connection, {
            body: {
              email: randomEmail,
              password: randomPassword,
            } satisfies IDiscussionBoardMember.ILogin,
          });
        },
      );
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_change_password_success(
  connection: api.IConnection,
) {
  // 1) Prepare unique member registration data
  const username = RandomGenerator.alphaNumeric(8); // allowed chars: letters/digits
  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Build an old (initial) password that meets the policy: >=12 chars and
  // at least three character categories (upper, lower, digit, symbol).
  const oldPassword = `${RandomGenerator.alphaNumeric(6)}A!${RandomGenerator.alphaNumeric(6)}`; // includes uppercase 'A' and symbol '!'

  const joinBody = {
    username,
    email,
    password: oldPassword,
    href,
    referrer,
  } satisfies IDiscussionBoardMember.IJoin;

  // 2) Register the member and obtain authorized response + tokens
  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "joined member username matches request",
    authorized.username,
    username,
  );

  // 3) Prepare a new password that deterministically satisfies policy and is different
  const newPassword = `B@${RandomGenerator.alphaNumeric(10)}c1`; // length >= 13, contains uppercase, symbol, digits and lowercase

  // 4) Change password from oldPassword -> newPassword
  await api.functional.auth.member.password.change.changePassword(connection, {
    body: {
      currentPassword: oldPassword,
      newPassword: newPassword,
      revokeSessions: true,
    } satisfies IDiscussionBoardMember.IChangePassword,
  });

  // 5) Business validation: using the old password must fail now
  await TestValidator.error(
    "old password should be rejected after change",
    async () => {
      await api.functional.auth.member.password.change.changePassword(
        connection,
        {
          body: {
            currentPassword: oldPassword,
            newPassword: `${RandomGenerator.alphaNumeric(12)}Z!`,
          } satisfies IDiscussionBoardMember.IChangePassword,
        },
      );
    },
  );

  // 6) Confirm the new password is valid by performing another change using it
  const anotherPassword = `C#${RandomGenerator.alphaNumeric(10)}d2`;
  await api.functional.auth.member.password.change.changePassword(connection, {
    body: {
      currentPassword: newPassword,
      newPassword: anotherPassword,
      revokeSessions: false,
    } satisfies IDiscussionBoardMember.IChangePassword,
  });

  // If we reached here, password-change operations behaved as expected.
  TestValidator.predicate("password change workflow completed", true);
}

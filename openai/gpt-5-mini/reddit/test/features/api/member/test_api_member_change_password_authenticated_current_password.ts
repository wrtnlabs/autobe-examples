import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

export async function test_api_member_change_password_authenticated_current_password(
  connection: api.IConnection,
) {
  // 1. Create a new member via POST /auth/member/join
  const username = RandomGenerator.alphaNumeric(10);
  const email = typia.random<string & tags.Format<"email">>();
  const oldPassword = RandomGenerator.alphaNumeric(12); // ensures length >= 8

  const joinBody = {
    username,
    email,
    password: oldPassword,
    display_name: RandomGenerator.name(2),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // Sanity checks on returned authorized member
  TestValidator.predicate(
    "member returned has id",
    typeof member.id === "string",
  );
  TestValidator.predicate(
    "member token.access present",
    typeof member.token?.access === "string",
  );

  // 2. Change password using current-password flow
  const newPassword1 = RandomGenerator.alphaNumeric(12);
  const changeRequest1 = {
    currentPassword: oldPassword,
    newPassword: newPassword1,
  } satisfies ICommunityPortalMember.IChangePassword.ICurrentPasswordFlow;

  const result1: ICommunityPortalMember.IChangePasswordResult =
    await api.functional.auth.member.password.change.changePassword(
      connection,
      {
        body: changeRequest1,
      },
    );
  typia.assert(result1);
  TestValidator.equals(
    "password change should succeed (first change)",
    result1.success,
    true,
  );

  // 3. Attempt to change password again using the OLD password (should fail)
  // This validates that the old password no longer authenticates as currentPassword
  await TestValidator.error(
    "old password should no longer be accepted",
    async () => {
      await api.functional.auth.member.password.change.changePassword(
        connection,
        {
          body: {
            currentPassword: oldPassword,
            newPassword: RandomGenerator.alphaNumeric(12),
          } satisfies ICommunityPortalMember.IChangePassword.ICurrentPasswordFlow,
        },
      );
    },
  );

  // 4. Verify that the new password now acts as currentPassword and can be used
  const newPassword2 = RandomGenerator.alphaNumeric(12);
  const changeRequest2 = {
    currentPassword: newPassword1,
    newPassword: newPassword2,
  } satisfies ICommunityPortalMember.IChangePassword.ICurrentPasswordFlow;

  const result2: ICommunityPortalMember.IChangePasswordResult =
    await api.functional.auth.member.password.change.changePassword(
      connection,
      {
        body: changeRequest2,
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "password change should succeed (second change)",
    result2.success,
    true,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";

export async function test_api_member_password_change_authenticated_flow(
  connection: api.IConnection,
) {
  /**
   * Authenticated password change flow with boundary checks.
   *
   * Steps:
   *
   * 1. Unauthenticated call to change password must fail (protected endpoint).
   * 2. Register a new member and obtain authentication (SDK sets Authorization
   *    header).
   * 3. Attempt change with incorrect current password should fail.
   * 4. Change with correct current password should succeed and emit a security
   *    event.
   * 5. Verify rotation: using the old (outdated) password should fail; using the
   *    new password as current should succeed with another rotation.
   */

  // 1) Unauthenticated attempt must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const unauthChangeBody = {
    current_password: RandomGenerator.alphaNumeric(12),
    new_password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconDiscussMember.IUpdatePassword;
  await TestValidator.error(
    "unauthenticated member cannot change password",
    async () => {
      await api.functional.auth.member.password.updatePassword(unauthConn, {
        body: unauthChangeBody,
      });
    },
  );

  // 2) Register a new member (SDK will authenticate this connection)
  const initialPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: initialPassword,
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 3) Wrong current password should fail
  const wrongChangeBody = {
    current_password: `${initialPassword}x`,
    new_password: RandomGenerator.alphaNumeric(14),
  } satisfies IEconDiscussMember.IUpdatePassword;
  await TestValidator.error("wrong current password is rejected", async () => {
    await api.functional.auth.member.password.updatePassword(connection, {
      body: wrongChangeBody,
    });
  });

  // 4) Correct current password should succeed (first rotation)
  const newPassword1 = RandomGenerator.alphaNumeric(15);
  const correctChangeBody1 = {
    current_password: initialPassword,
    new_password: newPassword1,
  } satisfies IEconDiscussMember.IUpdatePassword;
  const securityEvent1 =
    await api.functional.auth.member.password.updatePassword(connection, {
      body: correctChangeBody1,
    });
  typia.assert(securityEvent1);

  // 5a) Using outdated previous password as current must fail now
  const outdatedAttemptBody = {
    current_password: initialPassword,
    new_password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconDiscussMember.IUpdatePassword;
  await TestValidator.error(
    "outdated previous password cannot be used after rotation",
    async () => {
      await api.functional.auth.member.password.updatePassword(connection, {
        body: outdatedAttemptBody,
      });
    },
  );

  // 5b) Using the newly set password as current should succeed (second rotation)
  const newPassword2 = RandomGenerator.alphaNumeric(16);
  const correctChangeBody2 = {
    current_password: newPassword1,
    new_password: newPassword2,
  } satisfies IEconDiscussMember.IUpdatePassword;
  const securityEvent2 =
    await api.functional.auth.member.password.updatePassword(connection, {
      body: correctChangeBody2,
    });
  typia.assert(securityEvent2);
}

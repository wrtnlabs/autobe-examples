import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICivicBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUser";
import type { ICivicBoardUserPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUserPassword";

/**
 * Change password successfully and validate session behavior.
 *
 * End-to-end workflow:
 *
 * 1. Join a new member to obtain authenticated context (SDK sets Authorization).
 * 2. Change password with correct current password and strong new password.
 * 3. Validate result summary (ok=true, revoked_sessions=0 as there are no other
 *    sessions).
 * 4. Ensure current session remains valid by changing password again using the
 *    newly set password as current_password (should succeed).
 * 5. Confirm password rotation by attempting to change password using the old (now
 *    invalid) current password (should fail).
 */
export async function test_api_user_password_change_success(
  connection: api.IConnection,
) {
  // 1) Register a new member (authenticated context)
  const currentPassword1: string = RandomGenerator.alphaNumeric(12);
  const newPassword1: string = RandomGenerator.alphaNumeric(16);
  const newPassword2: string = RandomGenerator.alphaNumeric(18);

  const email: string = typia.random<string & tags.Format<"email">>();
  const href: string = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
  >();

  const authorized = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: currentPassword1,
      display_name: RandomGenerator.name(),
      ip: null,
      href,
      referrer: "",
    } satisfies ICivicBoardUser.ICreate,
  });
  typia.assert(authorized);
  if (authorized.user !== undefined)
    TestValidator.predicate(
      "newly joined account is not suspended",
      authorized.user.suspended === false,
    );

  // 2) Change password with correct current password
  const summary1 = await api.functional.auth.user.password.updatePassword(
    connection,
    {
      body: {
        current_password: currentPassword1,
        new_password: newPassword1,
      } satisfies ICivicBoardUserPassword.IUpdate,
    },
  );
  typia.assert(summary1);
  TestValidator.predicate(
    "first password change should succeed",
    summary1.ok === true,
  );
  TestValidator.equals(
    "no other sessions should be revoked on first change",
    summary1.revoked_sessions,
    0,
  );

  // 3) Attempt to change again using the old (now invalid) current password -> should fail
  await TestValidator.error(
    "changing with old password should fail after rotation",
    async () => {
      await api.functional.auth.user.password.updatePassword(connection, {
        body: {
          current_password: currentPassword1, // old password (invalid now)
          new_password: RandomGenerator.alphaNumeric(14),
        } satisfies ICivicBoardUserPassword.IUpdate,
      });
    },
  );

  // 4) Current session remains valid: change again using the new password as current
  const summary2 = await api.functional.auth.user.password.updatePassword(
    connection,
    {
      body: {
        current_password: newPassword1,
        new_password: newPassword2,
      } satisfies ICivicBoardUserPassword.IUpdate,
    },
  );
  typia.assert(summary2);
  TestValidator.predicate(
    "second password change (with new current password) should succeed",
    summary2.ok === true,
  );
  TestValidator.equals(
    "no other sessions should be revoked on second change as well",
    summary2.revoked_sessions,
    0,
  );
}

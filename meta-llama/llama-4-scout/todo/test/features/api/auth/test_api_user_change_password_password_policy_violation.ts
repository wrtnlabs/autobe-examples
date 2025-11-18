import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that password change rejects new password violating policy.
 *
 * 1. Register a new user via join (ensuring account activation is out of scope).
 * 2. Attempt password change using the correct password as old_password, but
 *    provide a new_password that is too short (<8 chars).
 * 3. Confirm the response indicates success: false and a reason containing
 *    "password".
 * 4. Optionally re-attempt password change with the same valid old password and a
 *    valid new password (should succeed, showing original password was not
 *    changed).
 */
export async function test_api_user_change_password_password_policy_violation(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphaNumeric(12); // at least 8 chars, satisfying policy
  const userJoinBody = {
    email,
    password: validPassword satisfies string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/login",
  } satisfies ITodoListUser.IJoin;
  const joinResult = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(joinResult);

  // 2. Attempt change-password with valid old password and invalid (too short) new password
  const tooShortPassword = RandomGenerator.alphaNumeric(4); // less than 8 chars
  const changePasswordFailBody = {
    old_password: validPassword,
    new_password: tooShortPassword,
  } satisfies ITodoListUser.IChangePassword;

  const failResult =
    await api.functional.auth.user.change_password.changePassword(connection, {
      body: changePasswordFailBody,
    });
  typia.assert(failResult);
  TestValidator.equals(
    "password change should fail for too-short password",
    failResult.success,
    false,
  );
  TestValidator.predicate(
    "failure reason should mention password",
    !!failResult.reason && /password|length|complex/i.test(failResult.reason),
  );

  // 3. Optional: Attempt a valid password change to confirm the old password remains valid
  const validNewPassword = RandomGenerator.alphaNumeric(12);
  const changePasswordSuccessBody = {
    old_password: validPassword,
    new_password: validNewPassword,
  } satisfies ITodoListUser.IChangePassword;
  const successResult =
    await api.functional.auth.user.change_password.changePassword(connection, {
      body: changePasswordSuccessBody,
    });
  typia.assert(successResult);
  TestValidator.equals(
    "password change should succeed with valid new password",
    successResult.success,
    true,
  );
}

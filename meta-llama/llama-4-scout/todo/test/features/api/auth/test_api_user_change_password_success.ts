import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate successful password change by an authenticated, verified todo-list
 * user account.
 *
 * 1. Register a new user via /auth/user/join, using a unique RFC 5322 email, a
 *    strong password (min 8 chars), and all required audit fields
 *    (href/referrer). Retrieve the resulting ITodoListUser.IAuthorized and
 *    assert is_verified=true (use returned value since explicit verification
 *    API is not present).
 * 2. Generate a new policy-compliant password (min 8 chars, password format) that
 *    is different from the original.
 * 3. Call /auth/user/change-password with old_password (the registration password)
 *    and new_password (freshly generated), asserting
 *    ITodoListUser.IChangePasswordResult.success===true and reason is empty or
 *    undefined.
 * 4. (As positive-path, we do NOT test login with old/new password since
 *    authenticate endpoint is not present; document intent in comments.)
 * 5. Validate state: The current session should remain active (no logout), and
 *    is_verified/is_active/user fields should not logically change as a result
 *    of password update (these fields may only change in error or
 *    account-status flows).
 */
export async function test_api_user_change_password_success(
  connection: api.IConnection,
) {
  // 1. Register user with unique email/password
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<
    string & tags.Format<"password"> & tags.MinLength<8>
  >();
  const displayName = RandomGenerator.name();
  const href = "https://test.example.com/register";
  const referrer = "https://test.example.com/";

  const joinResult: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: registrationEmail,
        password: registrationPassword,
        display_name: displayName,
        href,
        referrer,
      } satisfies ITodoListUser.IJoin,
    });
  typia.assert(joinResult);
  TestValidator.predicate(
    "new account is verified",
    joinResult.is_verified === true,
  );
  TestValidator.predicate(
    "new account is active",
    joinResult.is_active === true,
  );

  // 2. Prepare a new, policy-compliant password distinct from original
  let newPassword;
  do {
    newPassword = typia.random<
      string & tags.Format<"password"> & tags.MinLength<8>
    >();
  } while (newPassword === registrationPassword);

  // 3. Perform password change with correct old password and new password
  const changeResult =
    await api.functional.auth.user.change_password.changePassword(connection, {
      body: {
        old_password: registrationPassword,
        new_password: newPassword,
      } satisfies ITodoListUser.IChangePassword,
    });
  typia.assert(changeResult);
  TestValidator.equals(
    "password change should be successful",
    changeResult.success,
    true,
  );
  TestValidator.equals(
    "no error reason if success",
    changeResult.reason,
    undefined,
  );

  // 4. (No re-login API available; normal business logic would now test login with new/old password)
  // Documented intent: If login endpoint available, would now fail for old password and succeed for new password.

  // 5. Confirm that user session context/account fields remain unchanged
  // (No explicit API to confirm fields post password change, so comment here suffices.)
}

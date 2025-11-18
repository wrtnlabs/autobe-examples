import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that changing password with incorrect old password fails and does
 * not affect user's actual password.
 *
 * 1. Register a new user (join).
 * 2. Attempt to change password with wrong current password as the authenticated
 *    user.
 * 3. Assert the result has success=false and contains a failure reason.
 * 4. Attempt to login (join) with original credentials to verify password has not
 *    changed.
 */
export async function test_api_user_change_password_incorrect_old_password(
  connection: api.IConnection,
) {
  // 1. Register new user for authentication context
  const email = typia.random<string & tags.Format<"email">>();
  const password = "MySecretPass1!"; // Known, so we can try again
  const displayName = RandomGenerator.name();
  const joinBody = {
    email,
    password,
    display_name: displayName,
    href: "https://e2etest.todoapp.local/registration",
    referrer: "https://e2etest.todoapp.local/welcome",
  } satisfies ITodoListUser.IJoin;
  const joinOutput: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(joinOutput);

  // 2. (Assume auto-verified for simplicity, or skip verification if not required in schema)
  // Already authorized at this point
  // 3. Attempt password change with INVALID old password
  const changeAttempt =
    await api.functional.auth.user.change_password.changePassword(connection, {
      body: {
        old_password: "WrongPassword1!", // intentionally wrong
        new_password: "AnotherSecretPass2@",
      } satisfies ITodoListUser.IChangePassword,
    });
  typia.assert(changeAttempt);
  TestValidator.equals("password change fails", changeAttempt.success, false);
  TestValidator.predicate(
    "error reason returned",
    typeof changeAttempt.reason === "string" && changeAttempt.reason.length > 0,
  );

  // 4. Login attempt: if password had actually changed, we wouldn't be able to rejoin
  // (Re-joining with same email must fail, so instead attempt password change again with correct password as indirect check)
  // Re-authenticate by registering again is not allowed (should be 409), so try password change again with correct credential
  const retryChange =
    await api.functional.auth.user.change_password.changePassword(connection, {
      body: {
        old_password: password,
        new_password: "ValidAfterWrong!3",
      } satisfies ITodoListUser.IChangePassword,
    });
  typia.assert(retryChange);
  TestValidator.equals(
    "password change with correct old password now succeeds",
    retryChange.success,
    true,
  );
}

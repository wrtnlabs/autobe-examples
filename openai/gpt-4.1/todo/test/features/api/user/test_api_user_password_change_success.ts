import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Tests the successful workflow for a logged-in user changing their password.
 *
 * Scenario overview:
 *
 * - Registers a new user with unique random credentials
 * - Authenticates (logins) to establish a valid session
 * - Requests password change using the correct current password and a new
 *   password (meeting policy)
 * - Validates that:
 *
 *   1. Password change returns success and message
 *   2. Current session is expired after password change (further requests fail;
 *        re-login required)
 *   3. Logging in with new password is successful
 *   4. Logging in with old password fails
 *
 * Steps:
 *
 * 1. Register and obtain initial "authorized" (JWT + user info).
 * 2. Issue a password change request with current (original) password and random
 *    new password.
 * 3. Attempt an authenticated action (e.g., issue another password change or join)
 *    using old session/token—should fail (session invalidated).
 * 4. Authenticate again with the new password—should succeed.
 * 5. Attempt authentication with the old password—should fail.
 */
export async function test_api_user_password_change_success(
  connection: api.IConnection,
) {
  // 1. Register a new user and log in to obtain an authenticated session
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/register",
    referrer: "https://example.com/",
  } satisfies ITodoUser.IJoin;
  const registered: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: registrationBody },
  );
  typia.assert(registered);
  TestValidator.equals(
    "registered email matches input",
    registered.email,
    registrationBody.email,
  );

  // 2. Change password for the authenticated user
  const currentPassword = registrationBody.password;
  const newPassword = RandomGenerator.alphaNumeric(14) + "A1!@";
  const passwordChangeBody = {
    oldPassword: currentPassword,
    newPassword: newPassword,
  } satisfies ITodoUser.IChangePassword;
  const changeResult =
    await api.functional.auth.user.password.change.changePassword(connection, {
      body: passwordChangeBody,
    });
  typia.assert(changeResult);
  TestValidator.predicate(
    "password change reports success",
    changeResult.success === true,
  );
  TestValidator.predicate(
    "password change message is non-empty",
    typeof changeResult.message === "string" && changeResult.message.length > 0,
  );

  // 3. Attempt to use the old session/token for an authenticated action — should fail
  // (session invalidated: as the session is invalid, registration should fail with duplicate email, not session/permission!)
  await TestValidator.error(
    "using invalidated session after password change fails",
    async () => {
      // Try to reuse the current connection to change password again, which should require re-auth
      await api.functional.auth.user.password.change.changePassword(
        connection,
        {
          body: {
            oldPassword: newPassword,
            newPassword: RandomGenerator.alphaNumeric(16) + "B2$%",
          } satisfies ITodoUser.IChangePassword,
        },
      );
    },
  );

  // 4. Authenticate again (simulate new login) with the new password: must succeed
  const rejoinBody = {
    email: registrationBody.email,
    password: newPassword,
    href: "https://example.com/login",
    referrer: "https://example.com/",
  } satisfies ITodoUser.IJoin;
  const rejoined: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    { ...connection, headers: {} }, // reset session (force new login)
    { body: rejoinBody },
  );
  typia.assert(rejoined);
  TestValidator.equals(
    "rejoined email matches input",
    rejoined.email,
    registrationBody.email,
  );

  // 5. Attempt to authenticate with the OLD password (should fail)
  const oldLoginBody = {
    email: registrationBody.email,
    password: currentPassword,
    href: "https://example.com/login",
    referrer: "https://example.com/",
  } satisfies ITodoUser.IJoin;
  await TestValidator.error(
    "login with old password fails after password change",
    async () => {
      await api.functional.auth.user.join(
        { ...connection, headers: {} },
        { body: oldLoginBody },
      );
    },
  );
}

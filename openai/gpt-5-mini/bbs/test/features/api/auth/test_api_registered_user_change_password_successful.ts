import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * Validate successful password change for a registered user.
 *
 * Business context:
 *
 * - A registered user who knows their current password can change it to a new
 *   strong password. The server validates the currentPassword, updates the
 *   stored password hash, returns a generic success acknowledgement, and must
 *   reject attempts to change password using the old password afterwards.
 *
 * Test steps:
 *
 * 1. Create a unique registered user via POST /auth/registeredUser/join
 *    (IEconPoliticalForumRegisteredUser.IJoin). Capture the returned
 *    IEconPoliticalForumRegisteredUser.IAuthorized response and assert its
 *    shape (typia.assert).
 * 2. Call PUT /auth/registeredUser/password/change with the current password and a
 *    new password (IEconPoliticalForumRegisteredUser.IChangePassword). Assert
 *    the response is IEconPoliticalForumRegisteredUser.IGenericSuccess and that
 *    success === true.
 * 3. Attempt to call the same password-change endpoint again using the old
 *    password as currentPassword. Expect the server to reject this operation
 *    (await TestValidator.error) — this demonstrates that the old password is
 *    no longer acceptable for change operations.
 *
 * Notes:
 *
 * - The SDK's join() automatically sets connection.headers.Authorization to the
 *   returned access token. We do not manipulate connection.headers directly.
 * - Typia.assert is used for full response shape validation.
 */
export async function test_api_registered_user_change_password_successful(
  connection: api.IConnection,
) {
  // 1) Setup: create a new user via join
  const username = `test_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const oldPassword = "OldPass!23";
  const newPassword = "NewPass!45";

  const joinResponse: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username,
        email,
        password: oldPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  // Validate response shape and presence of token
  typia.assert(joinResponse);
  TestValidator.predicate(
    "join returns authorization token",
    !!(joinResponse && joinResponse.token && joinResponse.token.access),
  );

  // 2) Action: change password using the correct current password
  const success: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.password.change.changePassword(
      connection,
      {
        body: {
          currentPassword: oldPassword,
          newPassword: newPassword,
        } satisfies IEconPoliticalForumRegisteredUser.IChangePassword,
      },
    );
  typia.assert(success);
  TestValidator.equals("password change acknowledged", success.success, true);

  // 3) Post-condition: attempting to change password again using the OLD
  // password should fail (business validation). We expect the server to
  // reject this (e.g., incorrect current password) — use TestValidator.error
  // with async callback and await it.
  await TestValidator.error(
    "old password should no longer be accepted for change",
    async () => {
      await api.functional.auth.registeredUser.password.change.changePassword(
        connection,
        {
          body: {
            currentPassword: oldPassword, // old password should be rejected
            newPassword: "AnotherPass!67",
          } satisfies IEconPoliticalForumRegisteredUser.IChangePassword,
        },
      );
    },
  );

  // Note: Full login/refresh verification is not possible because no login or
  // refresh endpoints are present in the provided SDK. If those functions are
  // later available, tests should be extended to re-authenticate with the new
  // password and ensure old credentials fail at login time.
}

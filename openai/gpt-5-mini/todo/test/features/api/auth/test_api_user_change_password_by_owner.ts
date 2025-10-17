import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Verify owner-initiated change-password flow for authenticated TodoApp users.
 *
 * This test performs the following:
 *
 * 1. Registers a fresh user via POST /auth/user/join (join) and uses the returned
 *    authorization token (SDK sets connection.headers.Authorization).
 * 2. Performs a successful owner-initiated password change using currentPassword +
 *    newPassword and validates that updated_at is newer than created_at.
 * 3. Validates negative scenarios:
 *
 *    - Incorrect current password (expect 4xx)
 *    - Unauthenticated request (expect 4xx)
 *    - Malformed-but-typed payload (empty resetToken with newPassword) (expect 4xx)
 *
 * Notes:
 *
 * - Uses only available SDK functions: api.functional.auth.user.join and
 *   api.functional.auth.user.change_password.changePassword.
 * - All request bodies use `satisfies` to ensure compile-time DTO conformity.
 */
export async function test_api_user_change_password_by_owner(
  connection: api.IConnection,
) {
  // 1) Register a new user (join) and obtain authorization token
  const password: string = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password,
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // The SDK's join() sets connection.headers.Authorization automatically.
  // Record the profile times for later comparison if present.
  const originalCreatedAt: string | undefined = authorized.created_at;
  const originalUpdatedAt: string | undefined = authorized.updated_at;

  // 2) Happy path: change password by current password
  const newPassword: string = RandomGenerator.alphaNumeric(12);
  const changeBody = {
    currentPassword: password,
    newPassword,
  } satisfies ITodoAppUser.IChangePassword.IByCurrent;

  const profileAfterChange: ITodoAppUser.IProfile =
    await api.functional.auth.user.change_password.changePassword(connection, {
      body: changeBody,
    });
  typia.assert(profileAfterChange);

  // Business validation: updated_at should be >= created_at (if created_at returned)
  if (profileAfterChange.created_at && profileAfterChange.updated_at) {
    const created = new Date(profileAfterChange.created_at).getTime();
    const updated = new Date(profileAfterChange.updated_at).getTime();
    TestValidator.predicate(
      "updated_at must be equal or later than created_at after password change",
      updated >= created,
    );
  }

  // 3A) Negative: incorrect current password should fail (4xx)
  await TestValidator.error(
    "incorrect current password should fail",
    async () => {
      await api.functional.auth.user.change_password.changePassword(
        connection,
        {
          body: {
            currentPassword: "wrong-password-000",
            newPassword: RandomGenerator.alphaNumeric(12),
          } satisfies ITodoAppUser.IChangePassword.IByCurrent,
        },
      );
    },
  );

  // 3B) Negative: unauthenticated request should fail (create a copy without headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "change-password without authentication should fail",
    async () => {
      await api.functional.auth.user.change_password.changePassword(
        unauthConn,
        {
          body: {
            currentPassword: newPassword,
            newPassword: RandomGenerator.alphaNumeric(12),
          } satisfies ITodoAppUser.IChangePassword.IByCurrent,
        },
      );
    },
  );

  // 3C) Negative: malformed-but-typed payload (empty resetToken) should fail at runtime
  await TestValidator.error(
    "reset-token empty string should be rejected",
    async () => {
      await api.functional.auth.user.change_password.changePassword(
        connection,
        {
          body: {
            resetToken: "",
            newPassword: RandomGenerator.alphaNumeric(12),
          } satisfies ITodoAppUser.IChangePassword.IByReset,
        },
      );
    },
  );
}

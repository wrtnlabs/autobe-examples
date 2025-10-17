import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registered_user_change_password_with_invalid_current(
  connection: api.IConnection,
) {
  // 1) Create a new registered user with a known password
  const initialPassword = "CorrectOld!23";
  const newPassword = "NewPass!45";

  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: initialPassword,
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const authorized: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Attempt to change password using an incorrect current password and expect failure
  await TestValidator.error(
    "change password should fail when current password is incorrect",
    async () => {
      await api.functional.auth.registeredUser.password.change.changePassword(
        connection,
        {
          body: {
            currentPassword: "WrongOld!99",
            newPassword: newPassword,
          } satisfies IEconPoliticalForumRegisteredUser.IChangePassword,
        },
      );
    },
  );

  // 3) Verify that the original password is still valid by attempting a change with the correct current password
  const result: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.password.change.changePassword(
      connection,
      {
        body: {
          currentPassword: initialPassword,
          newPassword: newPassword,
        } satisfies IEconPoliticalForumRegisteredUser.IChangePassword,
      },
    );
  typia.assert(result);
  TestValidator.predicate(
    "password change with correct current password should succeed",
    result.success === true,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";

/**
 * Validate that an authenticated moderator can change their password.
 *
 * Steps:
 *
 * 1. Create a new moderator account via api.functional.auth.moderator.join.
 * 2. Call changePassword with the current password and a new password.
 * 3. Assert successful response shape and success flag.
 * 4. Attempt changePassword again using the old password and expect an error
 *    (server must verify currentPassword against stored hash).
 * 5. Attempt changePassword using the new password as currentPassword and expect
 *    success (verifies the new credential works for verification).
 *
 * Notes:
 *
 * - The SDK does not provide an explicit login function in the supplied
 *   materials; join issues initial tokens and sets
 *   connection.headers.Authorization.
 * - All type validations are performed with typia.assert. Business assertions use
 *   TestValidator utilities. All request bodies use `satisfies` with the exact
 *   DTO types.
 */
export async function test_api_moderator_change_password_success(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const originalPassword = RandomGenerator.alphaNumeric(12);
  const newPassword = RandomGenerator.alphaNumeric(12);
  const laterPassword = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    username: `mod_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: originalPassword,
    display_name: RandomGenerator.name(),
    avatar_uri: null,
  } satisfies ICommunityPortalModerator.ICreate;

  const moderator: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  typia.assert(moderator);

  // Basic sanity: token is attached by join implementation (SDK sets headers)
  TestValidator.predicate(
    "join returned token and id",
    typeof moderator.token?.access === "string" &&
      typeof moderator.id === "string",
  );

  // 2. Change password using correct currentPassword
  const changeResp: ICommunityPortalModerator.IChangePasswordResponse =
    await api.functional.auth.moderator.password.change.changePassword(
      connection,
      {
        body: {
          currentPassword: originalPassword,
          newPassword: newPassword,
        } satisfies ICommunityPortalModerator.IChangePassword,
      },
    );
  typia.assert(changeResp);

  // 3. Assert success flag and response shape
  TestValidator.predicate(
    "password change reported success",
    changeResp.success === true,
  );
  TestValidator.predicate(
    "change response has message",
    typeof changeResp.message === "string" && changeResp.message.length > 0,
  );

  // If userId is provided, it should match the created moderator id
  TestValidator.predicate(
    "userId matches or omitted",
    changeResp.userId === undefined || changeResp.userId === moderator.id,
  );

  // 4. Attempt to reuse OLD password: should fail (server verifies currentPassword)
  await TestValidator.error(
    "old password should be rejected after change",
    async () => {
      await api.functional.auth.moderator.password.change.changePassword(
        connection,
        {
          body: {
            currentPassword: originalPassword,
            newPassword: laterPassword,
          } satisfies ICommunityPortalModerator.IChangePassword,
        },
      );
    },
  );

  // 5. Use NEW password as currentPassword to change again (should succeed)
  const secondChange: ICommunityPortalModerator.IChangePasswordResponse =
    await api.functional.auth.moderator.password.change.changePassword(
      connection,
      {
        body: {
          currentPassword: newPassword,
          newPassword: laterPassword,
        } satisfies ICommunityPortalModerator.IChangePassword,
      },
    );
  typia.assert(secondChange);

  TestValidator.predicate(
    "second change reported success",
    secondChange.success === true,
  );
  TestValidator.predicate(
    "second change has message",
    typeof secondChange.message === "string" && secondChange.message.length > 0,
  );
}

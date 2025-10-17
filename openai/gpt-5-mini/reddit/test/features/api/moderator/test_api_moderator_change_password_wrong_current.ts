import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";

export async function test_api_moderator_change_password_wrong_current(
  connection: api.IConnection,
) {
  // Purpose: Verify that change-password rejects incorrect current password

  // 1) Prepare randomized moderator credentials
  const originalPassword = `P@ssw0rd!${RandomGenerator.alphaNumeric(6)}`; // >=8 chars
  const username = RandomGenerator.alphaNumeric(10);
  const email = typia.random<string & tags.Format<"email">>();

  // 2) Create moderator account (join). join will set Authorization on connection.
  const moderator: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username,
        email,
        password: originalPassword,
        display_name: RandomGenerator.name(),
        avatar_uri: null,
      } satisfies ICommunityPortalModerator.ICreate,
    });
  typia.assert(moderator);

  // Token must be present in the authorized response
  TestValidator.predicate(
    "join returned authorization token",
    Boolean(moderator.token && moderator.token.access),
  );

  // 3) Attempt change-password with incorrect current password -> expect error
  const wrongCurrent = originalPassword + "-wrong";
  const attemptedNew = `NewP@ss!${RandomGenerator.alphaNumeric(6)}`;

  await TestValidator.error(
    "changePassword should fail when provided currentPassword is incorrect",
    async () => {
      await api.functional.auth.moderator.password.change.changePassword(
        connection,
        {
          body: {
            currentPassword: wrongCurrent,
            newPassword: attemptedNew,
          } satisfies ICommunityPortalModerator.IChangePassword,
        },
      );
    },
  );

  // 4) Verify the original password is still valid by performing a successful change
  // Using the original password proves the failed attempt did not mutate stored password
  const finalNewPassword = `FinalP@ss!${RandomGenerator.alphaNumeric(6)}`;

  const changeResponse: ICommunityPortalModerator.IChangePasswordResponse =
    await api.functional.auth.moderator.password.change.changePassword(
      connection,
      {
        body: {
          currentPassword: originalPassword,
          newPassword: finalNewPassword,
        } satisfies ICommunityPortalModerator.IChangePassword,
      },
    );
  typia.assert(changeResponse);

  // Ensure operation reported success
  TestValidator.predicate(
    "changePassword succeeded with correct current password",
    changeResponse.success === true,
  );

  // Ensure server message does not leak sensitive internals
  TestValidator.predicate(
    "server message does not contain sensitive internals",
    !/password_hash|passwordHash|salt|hash/i.test(changeResponse.message),
  );
}

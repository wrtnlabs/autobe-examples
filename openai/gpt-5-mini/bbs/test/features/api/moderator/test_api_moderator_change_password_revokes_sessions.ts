import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_change_password_revokes_sessions(
  connection: api.IConnection,
) {
  // 1) Create a moderator via join with a policy-compliant password
  // Build a 12+ character password that includes uppercase, lowercase, digit and symbol.
  const passwordSeed = RandomGenerator.alphaNumeric(8); // letters+digits
  const originalPassword = `${passwordSeed}A1!a`; // guarantees at least 12 chars and mixed classes

  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: originalPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const auth = await api.functional.auth.moderator.join(connection, {
    body: joinBody,
  });
  typia.assert(auth);

  // Capture token (join sets connection.headers.Authorization internally)
  const token: IAuthorizationToken = auth.token;
  typia.assert(token);

  // 2) Change password: authenticated call using join-issued authorization
  const newPassword = `${RandomGenerator.alphaNumeric(8)}B2@b`; // ensures mixed classes and >=12 chars
  const changeBody = {
    currentPassword: originalPassword,
    newPassword,
  } satisfies IDiscussionBoardModerator.IChangePassword;

  const updated: IDiscussionBoardModerator =
    await api.functional.auth.moderator.password.change.changePassword(
      connection,
      { body: changeBody },
    );
  typia.assert(updated);

  // If join returned moderator summary, updated.updated_at must differ from prior value
  if (auth.moderator) {
    TestValidator.notEquals(
      "updated_at should change after password update",
      auth.moderator.updated_at,
      updated.updated_at,
    );
  }

  // 3) Post-change: verify that attempts using the old plain-text password fail.
  // NOTE: The SDK provided does not include a token refresh endpoint; therefore
  // direct refresh-token revocation testing is not possible here. Instead, we
  // validate that the old credential no longer works for authenticated
  // operations (business-level verification of password change).
  await TestValidator.error(
    "old password must be rejected after password change",
    async () => {
      await api.functional.auth.moderator.password.change.changePassword(
        connection,
        {
          body: {
            currentPassword: originalPassword,
            newPassword: `${RandomGenerator.alphaNumeric(8)}C3#c`,
          } satisfies IDiscussionBoardModerator.IChangePassword,
        },
      );
    },
  );

  // 4) Negative case: wrong current password should fail (valid DTO, business-rule error)
  await TestValidator.error("wrong current password should fail", async () => {
    await api.functional.auth.moderator.password.change.changePassword(
      connection,
      {
        body: {
          currentPassword: (originalPassword + "x").slice(0, 12), // still type-valid but incorrect
          newPassword: `${RandomGenerator.alphaNumeric(8)}D4$d`,
        } satisfies IDiscussionBoardModerator.IChangePassword,
      },
    );
  });
}

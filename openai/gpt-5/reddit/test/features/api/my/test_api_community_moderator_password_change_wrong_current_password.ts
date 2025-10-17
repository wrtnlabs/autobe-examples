import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorJoin";
import type { ICommunityPlatformCommunityModeratorPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorPassword";

/**
 * Reject password change when current password is wrong, and ensure no
 * accidental update occurs.
 *
 * Workflow
 *
 * 1. Register (join) a new communityModerator with a known password to obtain an
 *    authenticated session
 * 2. Attempt to change password with an intentionally wrong current password ->
 *    expect error
 * 3. Change password with the correct current password -> expect success
 * 4. Try changing password again using the now-outdated original password ->
 *    expect error
 *
 * Notes
 *
 * - Focus on business rule: correct current_password is required
 * - Do not assert specific HTTP status codes
 * - Do not touch connection.headers (SDK manages auth automatically)
 */
export async function test_api_community_moderator_password_change_wrong_current_password(
  connection: api.IConnection,
) {
  // 1) Register community moderator (join) with known password
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `mod_${RandomGenerator.alphabets(8)}`; // 3–20 chars, [A-Za-z0-9_]
  const originalPassword: string = `A1${RandomGenerator.alphaNumeric(10)}`; // >= 12 chars, includes letter and digit

  const joinBody = {
    email,
    username,
    password: originalPassword,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformCommunityModeratorJoin.ICreate;

  const authorized = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(authorized);

  // 2) Attempt password change with WRONG current password -> expect error
  const wrongCurrent: string = `Z9${RandomGenerator.alphaNumeric(10)}`;
  const newPasswordCandidate1: string = `B2${RandomGenerator.alphaNumeric(10)}`;
  await TestValidator.error(
    "reject wrong current password on password change",
    async () => {
      await api.functional.my.password.updatePassword(connection, {
        body: {
          current_password: wrongCurrent,
          new_password: newPasswordCandidate1,
        } satisfies ICommunityPlatformCommunityModeratorPassword.IUpdate,
      });
    },
  );

  // 3) Now change password with the CORRECT current password -> expect success
  const newPasswordCandidate2: string = `C3${RandomGenerator.alphaNumeric(10)}`;
  const security = await api.functional.my.password.updatePassword(connection, {
    body: {
      current_password: originalPassword,
      new_password: newPasswordCandidate2,
    } satisfies ICommunityPlatformCommunityModeratorPassword.IUpdate,
  });
  typia.assert<ICommunityPlatformCommunityModerator.ISecurity>(security);
  TestValidator.predicate(
    "security status should be non-empty",
    security.status.length > 0,
  );

  // 4) Try changing password again using the outdated ORIGINAL password -> expect error
  const newPasswordCandidate3: string = `D4${RandomGenerator.alphaNumeric(10)}`;
  await TestValidator.error(
    "outdated original password must be rejected after successful change",
    async () => {
      await api.functional.my.password.updatePassword(connection, {
        body: {
          current_password: originalPassword, // still the old one, should no longer be valid
          new_password: newPasswordCandidate3,
        } satisfies ICommunityPlatformCommunityModeratorPassword.IUpdate,
      });
    },
  );
}

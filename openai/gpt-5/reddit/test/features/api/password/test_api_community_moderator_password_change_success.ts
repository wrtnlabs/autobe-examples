import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorJoin";
import type { ICommunityPlatformCommunityModeratorPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorPassword";

/**
 * Validate successful password rotation for an authenticated community
 * moderator.
 *
 * Workflow:
 *
 * 1. Register a new communityModerator via POST /auth/communityModerator/join
 *    using ICommunityPlatformCommunityModeratorJoin.ICreate and capture the
 *    authenticated session (SDK auto-manages token).
 * 2. Change own password via PUT /my/password with a correct current password and
 *    a compliant new password
 *    (ICommunityPlatformCommunityModeratorPassword.IUpdate). Expect success and
 *    a security payload (ICommunityPlatformCommunityModerator.ISecurity).
 * 3. Immediately try another password change using the old password as current;
 *    expect failure (business rule: current must match latest credential).
 * 4. Optionally, perform a second successful change using the first new password
 *    as current to confirm continuity after rotation.
 *
 * Focus on business logic (current credential required, rotation applied) and
 * rely on typia.assert for full DTO conformance validation.
 */
export async function test_api_community_moderator_password_change_success(
  connection: api.IConnection,
) {
  // 1) Register and authenticate a new community moderator
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphaNumeric(12); // matches ^[A-Za-z0-9_]{3,20}$
  const initialPassword: string = `A1${RandomGenerator.alphaNumeric(8)}`; // >=1 letter & >=1 digit
  const nowIso: string = new Date().toISOString();

  const joinBody = {
    email,
    username,
    password: initialPassword,
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: nowIso,
  } satisfies ICommunityPlatformCommunityModeratorJoin.ICreate;

  const authorized = await api.functional.auth.communityModerator.join(
    connection,
    { body: joinBody },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(authorized);

  // 2) First password update with the correct current password → success
  const firstNewPassword: string = `B2${RandomGenerator.alphaNumeric(9)}`; // valid strength & length
  const sec1 = await api.functional.my.password.updatePassword(connection, {
    body: {
      current_password: initialPassword,
      new_password: firstNewPassword,
    } satisfies ICommunityPlatformCommunityModeratorPassword.IUpdate,
  });
  typia.assert<ICommunityPlatformCommunityModerator.ISecurity>(sec1);
  TestValidator.predicate(
    "password update returns non-empty status",
    sec1.status.length > 0,
  );

  // 3) Attempt update using the old (now invalid) current password → expect failure
  const invalidNextPassword: string = `C3${RandomGenerator.alphaNumeric(9)}`;
  await TestValidator.error(
    "using old password as current must fail",
    async () => {
      await api.functional.my.password.updatePassword(connection, {
        body: {
          current_password: initialPassword,
          new_password: invalidNextPassword,
        } satisfies ICommunityPlatformCommunityModeratorPassword.IUpdate,
      });
    },
  );

  // 4) Continuity check: update again using the first new password as current → success
  const secondNewPassword: string = `D4${RandomGenerator.alphaNumeric(9)}`;
  const sec2 = await api.functional.my.password.updatePassword(connection, {
    body: {
      current_password: firstNewPassword,
      new_password: secondNewPassword,
    } satisfies ICommunityPlatformCommunityModeratorPassword.IUpdate,
  });
  typia.assert<ICommunityPlatformCommunityModerator.ISecurity>(sec2);
  TestValidator.predicate(
    "second password update returns non-empty status",
    sec2.status.length > 0,
  );
}

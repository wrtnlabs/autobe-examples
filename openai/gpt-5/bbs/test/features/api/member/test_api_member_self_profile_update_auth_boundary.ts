import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserProfile";

/**
 * Validate authentication boundary and successful self profile update.
 *
 * Steps:
 *
 * 1. Try updating profile without Authorization header → expect error
 *    (unauthenticated boundary)
 * 2. Join as a new member to acquire auth token
 * 3. Update own profile with minimal payload (displayName)
 * 4. Validate response typing and business outcomes (id match, field updated)
 */
export async function test_api_member_self_profile_update_auth_boundary(
  connection: api.IConnection,
) {
  // 1) Unauthenticated boundary: clone connection without headers and try update
  const guestConn: api.IConnection = { ...connection, headers: {} };
  const unauthBody = {
    displayName: RandomGenerator.name(1),
  } satisfies IEconDiscussUserProfile.IUpdate;
  await TestValidator.error(
    "unauthenticated self profile update must fail",
    async () => {
      await api.functional.econDiscuss.member.me.update(guestConn, {
        body: unauthBody,
      });
    },
  );

  // 2) Join as a new member (SDK will set Authorization automatically)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const auth: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(auth);

  // 3) Authorized update with minimal valid payload (displayName only)
  const newDisplayName = RandomGenerator.name(1);
  const profile: IEconDiscussUserProfile =
    await api.functional.econDiscuss.member.me.update(connection, {
      body: {
        displayName: newDisplayName,
      } satisfies IEconDiscussUserProfile.IUpdate,
    });
  typia.assert(profile);

  // 4) Business validations
  TestValidator.equals(
    "updated profile belongs to the authenticated member",
    profile.id,
    auth.id,
  );
  TestValidator.equals(
    "displayName must be updated to submitted value",
    profile.displayName,
    newDisplayName,
  );
}

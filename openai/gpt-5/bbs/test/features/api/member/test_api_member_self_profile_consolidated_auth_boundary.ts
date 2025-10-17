import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserProfile";

export async function test_api_member_self_profile_consolidated_auth_boundary(
  connection: api.IConnection,
) {
  /**
   * Validate authentication boundary of GET /econDiscuss/member/me/profile.
   *
   * Steps:
   *
   * 1. Ensure unauthenticated access errors
   * 2. Join as a new member to obtain an authenticated session
   * 3. Fetch self profile successfully and validate business invariants
   */

  // 1) Unauthenticated access must fail (no specific HTTP status check)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to self profile should fail",
    async () => {
      await api.functional.econDiscuss.member.me.profile.at(unauthConn);
    },
  );

  // 2) Join as member to authenticate the base connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert<IEconDiscussMember.IAuthorized>(authorized);

  // 3) Authenticated access should succeed and match the authenticated subject
  const me = await api.functional.econDiscuss.member.me.profile.at(connection);
  typia.assert<IEconDiscussUserProfile>(me);

  // Profile should belong to the same subject as the authenticated member
  TestValidator.equals(
    "profile.id should match authorized member id",
    me.id,
    authorized.id,
  );

  // If server returned an embedded subject in authorization, basic fields should align
  if (authorized.member) {
    TestValidator.equals(
      "authorized.member.id should match profile.id",
      authorized.member.id,
      me.id,
    );
    TestValidator.equals(
      "displayName should align between auth subject and profile",
      me.displayName,
      authorized.member.displayName,
    );
  }
}

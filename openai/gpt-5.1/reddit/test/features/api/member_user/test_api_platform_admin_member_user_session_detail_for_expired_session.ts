import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can inspect details of a member user
 * session.
 *
 * This test exercises the read-only inspection capability for member user
 * sessions from the perspective of a platform administrator. Because there is
 * no API provided to create or control specific member user sessions, the test
 * relies on:
 *
 * 1. Registering and authenticating a platform administrator via POST
 *    /auth/platformAdmin/join.
 * 2. Calling GET
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/sessions/{sessionId}
 *    with randomly generated UUIDs for the path parameters.
 * 3. Validating that the response strictly matches
 *    ICommunityPlatformMemberuserSession using typia.assert.
 * 4. Performing lightweight business-oriented checks, including:
 *
 *    - The embedded memberUser summary can be asserted as
 *         ICommunityPlatformMemberuser.ISummary.
 *    - The memberUser.username is non-empty, so the session is attached to a usable
 *         identity.
 *    - When expired_at is non-null, created_at is not later than expired_at,
 *         reflecting a sensible session lifecycle ordering for expired
 *         sessions.
 *
 * The test does not attempt to guarantee that the returned record corresponds
 * to the randomly generated memberUserId/sessionId pair or to force creation of
 * an actually expired session, as those behaviors are outside the scope of the
 * provided APIs. Instead, any non-null expired_at is treated as an expired
 * session for the ordering assertion.
 */
export async function test_api_platform_admin_member_user_session_detail_for_expired_session(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Call the session detail endpoint as platformAdmin using random IDs.
  const memberUserId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session =
    await api.functional.communityPlatform.platformAdmin.memberUsers.sessions.at(
      connection,
      {
        memberUserId,
        sessionId,
      },
    );
  typia.assert<ICommunityPlatformMemberuserSession>(session);

  // 3. Structural and business-oriented validations.
  // 3-1. Member user summary must be structurally valid and have a non-empty username.
  typia.assert<ICommunityPlatformMemberuser.ISummary>(session.memberUser);
  TestValidator.predicate(
    "memberUser.username must be non-empty",
    () => session.memberUser.username.length > 0,
  );

  // 3-2. When expired_at is present and non-null, treat this as an expired
  //      session and ensure created_at is not later than expired_at.
  if (session.expired_at !== null && session.expired_at !== undefined) {
    const created = new Date(session.created_at).getTime();
    const expired = new Date(session.expired_at).getTime();

    TestValidator.predicate(
      "created_at should not be later than expired_at when expired_at is set",
      () => created <= expired,
    );
  }
}

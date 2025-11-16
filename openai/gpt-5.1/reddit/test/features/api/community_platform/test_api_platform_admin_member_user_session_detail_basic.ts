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
 * Basic positive-path validation for platform admin member user session detail.
 *
 * Business goal:
 *
 * - Ensure that, once a platform administrator is authenticated, they can
 *   successfully retrieve a detailed view of a single member user's session
 *   record via the platform-admin-only inspection endpoint.
 *
 * Scope and flow:
 *
 * 1. Register a new platform administrator using POST /auth/platformAdmin/join and
 *    obtain an authenticated connection (Authorization header is managed by the
 *    SDK via the returned token).
 * 2. Generate a pair of UUIDs to represent a target member user ID and session ID.
 *    Because there are no APIs for creating member users or member sessions in
 *    this test fixture, we treat the backend as running in simulation/mock mode
 *    where typia.random supplies a valid ICommunityPlatformMemberuserSession.
 * 3. Call GET
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/sessions/{sessionId}
 *    using
 *    api.functional.communityPlatform.platformAdmin.memberUsers.sessions.at.
 * 4. Assert that:
 *
 *    - The response conforms exactly to ICommunityPlatformMemberuserSession.
 *    - The response.id equals the requested sessionId.
 *    - The response.memberUser.id equals the requested memberUserId.
 *    - Core metadata fields such as ip, href, referrer, created_at, and expired_at
 *         are present and logically shaped (presence and basic expectations
 *         rather than detailed format checks, as typia.assert already
 *         guarantees format-level correctness).
 * 5. Rely on the DTO shape to guarantee that no sensitive authentication secrets
 *    (password hashes, raw tokens, etc.) are present in the payload.
 */
export async function test_api_platform_admin_member_user_session_detail_basic(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(platformAdmin);

  // 2. Prepare target member user and session identifiers.
  const memberUserId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call the session detail endpoint as the authenticated platform admin.
  const session: ICommunityPlatformMemberuserSession =
    await api.functional.communityPlatform.platformAdmin.memberUsers.sessions.at(
      connection,
      {
        memberUserId,
        sessionId,
      },
    );
  typia.assert(session);

  // 4.a ID consistency checks between request path and response payload.
  TestValidator.equals(
    "session detail: response id must match requested sessionId",
    session.id,
    sessionId,
  );

  TestValidator.equals(
    "session detail: response memberUser.id must match requested memberUserId",
    session.memberUser.id,
    memberUserId,
  );

  // 4.b Basic logical checks on core metadata fields (presence / non-empty).
  TestValidator.predicate(
    "session detail: ip should be a non-empty string",
    session.ip.length > 0,
  );

  TestValidator.predicate(
    "session detail: href should be a non-empty string",
    session.href.length > 0,
  );

  TestValidator.predicate(
    "session detail: referrer should be a non-empty string",
    session.referrer.length > 0,
  );

  TestValidator.predicate(
    "session detail: created_at must be defined",
    session.created_at.length > 0,
  );

  // expired_at may be null or undefined for active sessions; when present,
  // ensure it is non-empty. We do not enforce that it must be set.
  if (session.expired_at !== null && session.expired_at !== undefined) {
    TestValidator.predicate(
      "session detail: expired_at, when present, should be non-empty",
      session.expired_at.length > 0,
    );
  }
}

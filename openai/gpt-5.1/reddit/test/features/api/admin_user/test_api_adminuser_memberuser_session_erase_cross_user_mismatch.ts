import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberuserSession";

/**
 * Validate that adminUser session erase enforces ownership between username and
 * sessionId.
 *
 * Business goal: Ensure that an administrative actor cannot delete a memberUser
 * session by mixing another user’s username with a foreign sessionId. The
 * composite identifier (username + sessionId) must always resolve to a real
 * ownership pair, otherwise erase must fail and leave all sessions untouched.
 *
 * Scenario steps
 *
 * 1. Register an adminUser via /auth/adminUser/join so that subsequent
 *    communityPlatform.adminUser endpoints are authorized.
 * 2. Register memberUser A and memberUser B via /auth/memberUser/join. Each join
 *    creates its own initial session in
 *    community_platform_memberuser_sessions.
 * 3. As the adminUser, call PATCH
 *    /communityPlatform/adminUser/memberUsers/{username}/sessions for both A
 *    and B to list their sessions and capture at least one concrete sessionId
 *    per user (sessionA and sessionB).
 * 4. Attempt to erase with a cross-user mismatch: call DELETE
 *    /communityPlatform/adminUser/memberUsers/{username}/sessions/{sessionId}
 *    using username of A and the sessionId captured from B. This call must fail
 *    because the session does not belong to A.
 * 5. Perform the mirrored mismatch: username of B combined with sessionId from A.
 * 6. Re-list sessions for both A and B through the admin listing endpoint and
 *    assert that the original session counts remain unchanged, proving that no
 *    sessions were accidentally removed.
 */
export async function test_api_adminuser_memberuser_session_erase_cross_user_mismatch(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain authorized admin context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Register two member users A and B, each creating its own session.
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 3. As adminUser (token already set by admin join), list sessions for A and B
  //    through the admin sessions.index endpoint and capture session IDs.
  const listRequest = {
    from: null,
    to: null,
    ip: null,
    href: null,
    referrer: null,
    status: null,
    page: 1,
    limit: 10,
    orderBy: null,
    orderDirection: null,
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  const pageA: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username: memberA.username,
        body: listRequest,
      },
    );
  typia.assert(pageA);

  const pageB: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username: memberB.username,
        body: listRequest,
      },
    );
  typia.assert(pageB);

  const countA = pageA.pagination.records;
  const countB = pageB.pagination.records;

  await TestValidator.predicate(
    "member A should have at least one session",
    async () => pageA.data.length > 0,
  );
  await TestValidator.predicate(
    "member B should have at least one session",
    async () => pageB.data.length > 0,
  );

  const sessionA = pageA.data[0];
  const sessionB = pageB.data[0];

  // Sanity: ensure ownership alignment
  TestValidator.equals(
    "session A owner username matches memberA.username",
    sessionA.memberUser.username,
    memberA.username,
  );
  TestValidator.equals(
    "session B owner username matches memberB.username",
    sessionB.memberUser.username,
    memberB.username,
  );

  // 4. Attempt to erase sessionB using username of memberA (cross-user mismatch).
  await TestValidator.error(
    "cross-user erase A+sessionB must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.sessions.erase(
        connection,
        {
          username: memberA.username,
          sessionId: sessionB.id,
        },
      );
    },
  );

  // 5. Mirror case: username B with sessionA.
  await TestValidator.error(
    "cross-user erase B+sessionA must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.sessions.erase(
        connection,
        {
          username: memberB.username,
          sessionId: sessionA.id,
        },
      );
    },
  );

  // 6. Re-list sessions for both A and B and ensure counts are unchanged.
  const pageANow: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username: memberA.username,
        body: listRequest,
      },
    );
  typia.assert(pageANow);

  const pageBNow: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username: memberB.username,
        body: listRequest,
      },
    );
  typia.assert(pageBNow);

  TestValidator.equals(
    "member A session count unchanged after cross-user erase attempts",
    pageANow.pagination.records,
    countA,
  );
  TestValidator.equals(
    "member B session count unchanged after cross-user erase attempts",
    pageBNow.pagination.records,
    countB,
  );
}

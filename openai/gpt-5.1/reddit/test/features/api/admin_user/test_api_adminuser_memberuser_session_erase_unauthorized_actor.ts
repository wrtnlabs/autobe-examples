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
 * Validate that non-admin or unauthenticated actors cannot erase member user
 * sessions through the admin-only DELETE
 * /communityPlatform/adminUser/memberUsers/{username}/sessions/{sessionId}
 * endpoint.
 *
 * Business purpose
 *
 * - Ensure that only adminUser actors are allowed to manipulate memberUser
 *   session rows.
 * - Prove that memberUser-authenticated requests and anonymous (unauthenticated)
 *   requests are rejected when calling the admin-only session erase endpoint.
 * - Confirm that failed authorization attempts do not delete or mutate the
 *   targeted session.
 *
 * High level steps
 *
 * 1. Create a memberUser (A), which implicitly creates an initial session.
 * 2. Create an adminUser which will be used only for reading session lists.
 * 3. As adminUser, list sessions for member A and pick one concrete sessionId.
 * 4. Using a memberUser-authenticated connection, attempt to erase that session
 *    via the admin-only erase endpoint and expect an HTTP error.
 * 5. Using an unauthenticated connection, attempt the same erase and expect an
 *    HTTP error.
 * 6. After both failed attempts, as adminUser, re-list sessions and assert that
 *    the session with the chosen sessionId still exists.
 */
export async function test_api_adminuser_memberuser_session_erase_unauthorized_actor(
  connection: api.IConnection,
) {
  // 1. Create memberUser A on a fresh connection that will become the member actor.
  const memberConnection: api.IConnection = { ...connection };
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(memberConnection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Prepare a separate connection for adminUser; do not reuse memberConnection.
  const adminConnection: api.IConnection = { ...connection };
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPw#1" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(adminConnection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As adminUser, list sessions for the member user and select a target session.
  const listRequestBody = {
    from: null,
    to: null,
    ip: null,
    href: null,
    referrer: null,
    status: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: null,
    orderDirection: null,
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  const initialPage: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      adminConnection,
      {
        username: memberAuthorized.username,
        body: listRequestBody,
      },
    );
  typia.assert(initialPage);

  TestValidator.predicate(
    "there must be at least one session for the member user",
    () => initialPage.data.length > 0,
  );

  const targetSession: ICommunityPlatformMemberuserSession.ISummary =
    initialPage.data[0];
  const targetSessionId = targetSession.id;

  // 4. Attempt erase as a memberUser actor using memberConnection.
  await TestValidator.httpError(
    "memberUser actor cannot erase sessions via admin-only endpoint",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.sessions.erase(
        memberConnection,
        {
          username: memberAuthorized.username,
          sessionId: targetSessionId,
        },
      );
    },
  );

  // 5. Attempt erase as an unauthenticated actor using a fresh connection without headers.
  const anonymousConnection: api.IConnection = {
    host: connection.host,
  };

  await TestValidator.httpError(
    "unauthenticated caller cannot erase sessions via admin-only endpoint",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.sessions.erase(
        anonymousConnection,
        {
          username: memberAuthorized.username,
          sessionId: targetSessionId,
        },
      );
    },
  );

  // 6. Re-list sessions as adminUser and assert the session still exists.
  const finalPage: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      adminConnection,
      {
        username: memberAuthorized.username,
        body: listRequestBody,
      },
    );
  typia.assert(finalPage);

  TestValidator.predicate(
    "target session still exists after unauthorized erase attempts",
    () => finalPage.data.some((session) => session.id === targetSessionId),
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberuserSession";

/**
 * Validate that an authenticated adminUser can erase a specific member user
 * session.
 *
 * Business workflow:
 *
 * 1. Join as adminUser to obtain an admin JWT context on the connection.
 * 2. Create a minimal but valid system configuration entry as adminUser so that
 *    admin features operate under a realistic configuration environment.
 * 3. Join as memberUser to create a new member account and an initial memberUser
 *    session row backed by community_platform_memberuser_sessions.
 * 4. Join again as adminUser so that subsequent communityPlatform.adminUser
 *    operations are executed with admin privileges.
 * 5. As adminUser, list sessions for the created member user via PATCH
 *    /communityPlatform/adminUser/memberUsers/{username}/sessions and confirm
 *    that at least one session exists and that all sessions belong to the
 *    target username.
 * 6. Pick one concrete session id from the list and erase it via DELETE
 *    /communityPlatform/adminUser/memberUsers/{username}/sessions/{sessionId}.
 * 7. List sessions again and assert that the erased session no longer appears in
 *    the results while the call itself succeeds without error.
 */
export async function test_api_adminuser_memberuser_session_erase_happy_path(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to obtain an admin JWT context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Password123!", // any non-empty string is acceptable for password format
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a minimal but valid system configuration entry as adminUser.
  const systemConfigBody = {
    category: "auth",
    config_key: "member_session_test_flag",
    value: "enabled",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const createdConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: systemConfigBody,
      },
    );
  typia.assert(createdConfig);

  // 3. Join as memberUser to create a new member and an initial session.
  const memberUsername = RandomGenerator.name(1);
  const memberJoinBody = {
    username: memberUsername,
    email: `${RandomGenerator.alphabets(10)}@member.test`,
    password: "MemberPass123!", // length >= 8
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  TestValidator.equals(
    "member join should return same username",
    memberAuthorized.username,
    memberUsername,
  );

  // 4. Join again as adminUser to restore admin context on the connection.
  const adminRejoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "AnotherAdmin123!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedAgain: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminRejoinBody,
    });
  typia.assert(adminAuthorizedAgain);

  // 5. As adminUser, list sessions for the member user.
  const initialRequestBody = {
    from: null,
    to: null,
    ip: null,
    href: null,
    referrer: null,
    status: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: null,
    orderDirection: null,
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  const initialPage: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username: memberUsername,
        body: initialRequestBody,
      },
    );
  typia.assert(initialPage);

  TestValidator.predicate(
    "initial sessions list should contain at least one session",
    initialPage.pagination.records > 0,
  );

  const initialSessions: ICommunityPlatformMemberuserSession.ISummary[] =
    initialPage.data;

  TestValidator.predicate(
    "all returned sessions must belong to the target username",
    initialSessions.every(
      (session) => session.memberUser.username === memberUsername,
    ),
  );

  const targetSession:
    | ICommunityPlatformMemberuserSession.ISummary
    | undefined = initialSessions[0];

  TestValidator.predicate(
    "selected target session must be defined",
    targetSession !== undefined,
  );

  const targetSessionId = targetSession!.id;

  // 6. Erase the selected session as adminUser.
  await api.functional.communityPlatform.adminUser.memberUsers.sessions.erase(
    connection,
    {
      username: memberUsername,
      sessionId: targetSessionId,
    },
  );

  // 7. List sessions again and confirm the target session has been removed.
  const afterRequestBody = {
    from: null,
    to: null,
    ip: null,
    href: null,
    referrer: null,
    status: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: null,
    orderDirection: null,
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  const afterPage: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username: memberUsername,
        body: afterRequestBody,
      },
    );
  typia.assert(afterPage);

  const afterSessions: ICommunityPlatformMemberuserSession.ISummary[] =
    afterPage.data;

  TestValidator.predicate(
    "erased session id must not appear in subsequent session list",
    afterSessions.every((session) => session.id !== targetSessionId),
  );
}

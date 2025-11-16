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
 * Validate adminUser erasing a non-existent memberUser session.
 *
 * Business goal
 *
 * - Ensure that when an adminUser tries to erase a sessionId that does not exist
 *   for a real member user, the API fails safely (no existing sessions are
 *   removed) and reports an error.
 *
 * Flow
 *
 * 1. Join an adminUser (POST /auth/adminUser/join) and rely on SDK to attach the
 *    admin token to the connection.
 * 2. Create a simple system config (POST
 *    /communityPlatform/adminUser/systemConfigs) just to mirror realistic admin
 *    environment usage.
 * 3. Join a memberUser (POST /auth/memberUser/join) to obtain a valid username.
 * 4. As the adminUser, list this member user’s sessions via PATCH
 *    /communityPlatform/adminUser/memberUsers/{username}/sessions
 *    (sessions.index) to obtain the existing session list.
 * 5. Construct a UUID value that is guaranteed not to exist in the list (e.g.,
 *    generate random UUIDs until they differ from all session ids).
 * 6. Call DELETE
 *    /communityPlatform/adminUser/memberUsers/{username}/sessions/{sessionId}
 *    using that non-existent sessionId and expect it to fail.
 *
 *    - Because we are not allowed to assert HTTP status code directly, we only
 *         assert that some error is thrown using TestValidator.error.
 * 7. Re-list sessions and assert that the session list is unchanged by comparing
 *    the data arrays with TestValidator.equals.
 */
export async function test_api_adminuser_memberuser_session_erase_nonexistent_session(
  connection: api.IConnection,
) {
  // 1. Join adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a simple system config
  const systemConfigBody = {
    category: "auth",
    config_key: "test_session_erase_nonexistent",
    value: "enabled",
    description: "E2E test config for non-existent session erase scenario",
    is_active: true,
  } satisfies ICommunityPlatformSystemConfig.ICreate;

  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: systemConfigBody,
      },
    );
  typia.assert(systemConfig);

  // 3. Join a memberUser to get a valid username
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!", // satisfies MinLength<8>
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  const username: string = member.username;

  // Helper to build a neutral search request for sessions
  const baseSearchRequest = {
    from: null,
    to: null,
    ip: null,
    href: null,
    referrer: null,
    status: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: null,
    orderDirection: null,
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  // 4. List existing sessions for this member user
  const beforePage: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username,
        body: baseSearchRequest,
      },
    );
  typia.assert(beforePage);

  const beforeSessionIds = beforePage.data.map((s) => s.id);

  // 5. Generate a UUID that is guaranteed not to exist in current sessions
  const generateUniqueSessionId = (): string & tags.Format<"uuid"> => {
    while (true) {
      const candidate = typia.random<string & tags.Format<"uuid">>();
      if (!beforeSessionIds.includes(candidate)) return candidate;
    }
  };

  const nonexistentSessionId: string & tags.Format<"uuid"> =
    generateUniqueSessionId();

  // 6. Attempt to erase non-existent session and expect an error
  await TestValidator.error(
    "erasing non-existent memberUser session should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.sessions.erase(
        connection,
        {
          username,
          sessionId: nonexistentSessionId,
        },
      );
    },
  );

  // 7. Re-list sessions and assert they are unchanged
  const afterPage: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username,
        body: baseSearchRequest,
      },
    );
  typia.assert(afterPage);

  TestValidator.equals(
    "session list should remain unchanged after failed erase of non-existent session",
    afterPage.data,
    beforePage.data,
  );
}

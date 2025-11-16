import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_get_moderator_session_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin to establish authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Use authenticated context to retrieve a moderator session once
  const probeSession: ICommunityPlatformCommunityModeratorSession =
    await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.at(
      connection,
      {
        communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorSession>(probeSession);

  const communityModeratorId =
    probeSession.community_platform_communitymoderator_id;
  const sessionId = probeSession.id;

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Call the same endpoint without auth and expect an authorization error
  await TestValidator.error(
    "community moderator session fetch without platformAdmin auth must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.at(
        unauthenticated,
        {
          communityModeratorId,
          sessionId,
        },
      );
    },
  );

  // 5. Control: call again with authenticated admin connection and expect success
  const reloaded: ICommunityPlatformCommunityModeratorSession =
    await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.at(
      connection,
      {
        communityModeratorId,
        sessionId,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorSession>(reloaded);

  TestValidator.equals(
    "session id must be stable between authorized calls",
    reloaded.id,
    sessionId,
  );
  TestValidator.equals(
    "community moderator owner id must match between calls",
    reloaded.community_platform_communitymoderator_id,
    communityModeratorId,
  );
}

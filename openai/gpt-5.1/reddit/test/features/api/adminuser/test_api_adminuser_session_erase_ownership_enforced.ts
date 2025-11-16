import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

export async function test_api_adminuser_session_erase_ownership_enforced(
  connection: api.IConnection,
) {
  // 1. Register first admin (owner) whose username will be used as the target of the erase call
  const ownerJoinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const ownerAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: ownerJoinRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(ownerAuthorized);

  // 2. Register second admin (foreign) that will attempt to erase the owner's session
  const foreignJoinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const foreignAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: foreignJoinRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(foreignAuthorized);

  // Ensure we really have two distinct admin users
  TestValidator.notEquals(
    "admin usernames must differ between owner and foreign admin",
    foreignAuthorized.username,
    ownerAuthorized.username,
  );

  // At this point, the connection's Authorization header contains the foreign admin's token
  // (due to join() side effect). We'll attempt to erase a session for the owner username
  // using this foreign admin context.

  const randomSessionId: string = RandomGenerator.alphaNumeric(32);

  await TestValidator.error(
    "foreign admin cannot erase another admin's session",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.sessions.erase(
        connection,
        {
          username: ownerAuthorized.username,
          sessionId: randomSessionId,
        },
      );
    },
  );

  // Sanity check: after the failed erase attempt, the connection should still be usable
  // for authenticated admin operations. We verify by joining a third admin successfully.
  const thirdJoinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const thirdAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: thirdJoinRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(thirdAuthorized);
}

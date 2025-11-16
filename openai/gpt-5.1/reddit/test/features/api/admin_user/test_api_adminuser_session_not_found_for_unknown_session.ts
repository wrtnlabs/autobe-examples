import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuserSession";

export async function test_api_adminuser_session_not_found_for_unknown_session(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser so that we have a valid actor
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorized);

  // 2. Generate a random, well-formed sessionId that should not exist
  const unknownSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to retrieve a non-existent session for this adminUser
  await TestValidator.error(
    "requesting unknown admin session must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.sessions.at(
        connection,
        {
          username: authorized.username,
          sessionId: unknownSessionId,
        },
      );
    },
  );
}

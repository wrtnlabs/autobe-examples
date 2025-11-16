import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_member_user_self_account_deletion(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Basic sanity: username should be consistent between request and response
  TestValidator.equals(
    "joined username matches authorized.username",
    authorized.username,
    joinBody.username,
  );

  // 2. Self-account deletion: delete the account using its own username
  await api.functional.communityPlatform.memberUser.memberUsers.erase(
    connection,
    {
      username: authorized.username,
    },
  );
}

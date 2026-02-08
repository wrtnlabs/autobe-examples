import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_community_user_ban_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test authorization enforcement by attempting to ban a user without moderator or owner privileges.
  // Validate that the API denies access with a proper authorization error.
  // Ensure no ban record is created and the user retains posting and commenting privileges in the community.
  // Create a normal user connection (unauthorized user) without moderator token
  const normalUserConnection: api.IConnection = { host: connection.host };
  // Prepare ban data for a target user
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const banRequest: ICommunityPlatformCommunityBannedUser.IBan = {
    userId: typia.random<string & tags.Format<"uuid">>(),
    banReason: "Unauthorized ban attempt test",
  };
  // Attempt to ban using unauthorized user, expect 403 Forbidden or 401 Unauthorized
  await TestValidator.httpError(
    "unauthorized user cannot ban",
    [403, 401],
    async () => {
      await api.functional.communityPlatform.moderator.communities.banned_users.ban(
        normalUserConnection,
        {
          communityId,
          body: banRequest,
        },
      );
    },
  );
}

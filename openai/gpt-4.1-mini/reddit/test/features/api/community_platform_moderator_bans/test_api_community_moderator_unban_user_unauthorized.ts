import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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

export async function test_api_community_moderator_unban_user_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests that unbanning a user without moderator authentication will fail
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Generate random UUIDs for communityId and bannedUserId
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Attempt unban without any authorization
  await TestValidator.httpError(
    "unauthorized unban attempt should be rejected with 401",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.communities.bans.unban(
        unauthorizedConnection,
        { communityId, bannedUserId },
      );
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_banned_user_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that accessing the banned user retrieval endpoint without authentication returns 401 Unauthorized error.
  const baseConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID for banned user id to attempt retrieval
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to call the banned user retrieval endpoint without any authorization
  await TestValidator.httpError(
    "unauthorized access should return 401",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.banned_users.at(
        baseConnection,
        {
          id: bannedUserId,
        },
      );
    },
  );
}

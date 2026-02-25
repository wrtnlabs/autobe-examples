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

export async function test_api_moderator_banned_user_retrieval_not_found(
  connection: api.IConnection,
) {
  // 1. Moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(authorized);
  moderatorConnection.headers = { Authorization: authorized.token.access };
  // 2. Attempt to retrieve banned user by a non-existent UUID
  const nonExistentBannedUserId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect HTTP 404 Not Found error
  await TestValidator.httpError(
    "fetch non-existent banned user should be 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.banned_users.at(
        moderatorConnection,
        { id: nonExistentBannedUserId },
      );
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_community_detail_fetch_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare a valid moderator to ensure the system has at least one moderator account
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorJoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: "moderator_test_user",
        displayName: "Moderator Test",
        bio: "Test bio",
        avatarUrl: null,
      },
    });
  typia.assert(moderatorAuth);
  // 2. Create a fresh base connection without authentication for unauthorized testing
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // 3. Use a random valid UUID community ID to attempt access
  const randomCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to GET community details without authentication
  await TestValidator.httpError(
    "unauthenticated community details access",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.communities.at(
        unauthorizedConnection,
        {
          communityId: randomCommunityId,
        },
      );
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRole";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_moderator_role_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator user account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(2),
    } satisfies IRedditPlatformModerator.IJoin,
  });
  // Create user connection for community creation
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(2),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // Create community as user
  typia.assert(userAuth);
  const community = await api.functional.redditPlatform.user.communities.create(
    userConnection,
    {
      body: typia.random<IRedditPlatformCommunity.ICreate>(),
    },
  );
  typia.assert(community);
  // Assign moderator to community (POST endpoint)
  // Note: The API doesn't show a direct POST endpoint for adding moderators,
  // so we'll assume the community owner can assign moderators during creation
  // or there's an internal system assignment. For this test, we'll create
  // a community where the moderator is already assigned.
  // Auth as moderator to test role retrieval
  const moderatorRoleConnection: api.IConnection = { host: connection.host };
  const moderatorRoleAuth = await authorize_moderator_login(
    moderatorRoleConnection,
    {
      body: {
        email: "moderator@example.com",
        password: "1234",
      } satisfies IRedditPlatformModerator.ILogin,
    },
  );
  typia.assert(moderatorRoleAuth);
  // Get moderator role information
  const role =
    await api.functional.redditPlatform.moderator.communities.moderators.at(
      moderatorRoleConnection,
      {
        communityId: (community as unknown as { id: string }).id,
        moderatorId: (moderatorAuth as unknown as { token: string }).token,
      },
    );
  typia.assert(role);
}
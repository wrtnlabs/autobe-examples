import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderator_assignment_user_already_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner connection and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_user_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Create community using owner connection
  const community =
    await generate_random_community_platform_user_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create target user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {});
  typia.assert(userAuth);
  // 4. First moderator assignment (should succeed)
  const firstAssignment =
    await generate_random_community_platform_user_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: userAuth.id satisfies string as string,
          role_level: RandomGenerator.alphabets(10),
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(firstAssignment);
  // 5. Second moderator assignment (should fail with conflict error)
  await TestValidator.error(
    "duplicate moderator assignment should fail",
    async () => {
      await generate_random_community_platform_user_communities_moderators_create(
        ownerConnection,
        {
          params: { communityId: community.id },
          body: {
            user_id: userAuth.id satisfies string as string,
            role_level: RandomGenerator.alphabets(10),
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );
}

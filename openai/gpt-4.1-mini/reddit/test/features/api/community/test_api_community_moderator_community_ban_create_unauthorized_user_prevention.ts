import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_bans_create } from "../../../generate/generate_random_community_platform_moderator_communities_bans_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_moderator_community_ban_create_unauthorized_user_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific connections
  const user1Connection: api.IConnection = { host: connection.host };
  const user2Connection: api.IConnection = { host: connection.host };
  // 1. Create and authorize user1
  const user1 = await authorize_user_join(user1Connection, { body: {} });
  typia.assert(user1);
  // 2. Create and authorize user2 (target of ban)
  const user2 = await authorize_user_join(user2Connection, { body: {} });
  typia.assert(user2);
  // 3. User1 creates a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      user1Connection,
      { body: {} },
    );
  typia.assert(community);
  // 4. User1 (non-moderator) attempts to create a ban for user2 in the community
  await TestValidator.error(
    "non-moderator user cannot create community ban",
    async () => {
      await api.functional.communityPlatform.moderator.communities.bans.create(
        user1Connection,
        {
          communityId: (community as any).community_id || (community as any).id || "",
          body: {},
        },
      );
    },
  );
}

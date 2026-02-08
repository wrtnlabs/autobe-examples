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

export async function test_api_community_moderator_unban_user_already_unbanned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and login
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResponse = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorJoinResponse);
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: {},
  });
  // 2. User registration and login
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoinResponse = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(userJoinResponse);
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {},
  });
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // 4. Moderator bans the user in the community
  const ban =
    await generate_random_community_platform_moderator_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId: (community as any).id ?? (community as any).communityId ?? "" },
        body: {},
      },
    );
  typia.assert(ban);
  // 5. Moderator unbans the user (first time)
  const bannedUserId = (ban as any).userId ?? (ban as any).user_id ?? userJoinResponse.token.access;
  const firstUnban =
    await api.functional.communityPlatform.moderator.communities.bans.unban(
      moderatorConnection,
      {
        communityId: (community as any).id ?? (community as any).communityId ?? "",
        bannedUserId: bannedUserId,
      },
    );
  typia.assert(firstUnban);
  // 6. Moderator attempts to unban the user again (already unbanned)
  await TestValidator.error("unban already unbanned user", async () => {
    await api.functional.communityPlatform.moderator.communities.bans.unban(
      moderatorConnection,
      {
        communityId: (community as any).id ?? (community as any).communityId ?? "",
        bannedUserId: bannedUserId,
      },
    );
  });
}

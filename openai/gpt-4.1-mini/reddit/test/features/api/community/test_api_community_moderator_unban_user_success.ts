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

export async function test_api_community_moderator_unban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // Moderator joins and logs in
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    { body: {} },
  );
  typia.assert(moderatorAuthorized);
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, { body: {} });

  // User joins and logs in
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(userAuthorized);
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, { body: {} });

  // User creates a community
  let community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      { body: {} },
    );
  typia.assert(community);

  // We assert that community must be cast to any to access 'id'
  const community_id = (community as any).id as string;

  // Moderator must login again to reflect roles (simulate role propagation)
  await authorize_moderator_login(moderatorConnection, { body: {} });

  // Moderator bans the user in the community
  const ban =
    await generate_random_community_platform_moderator_communities_bans_create(
      moderatorConnection,
      {
        params: {
          communityId: community_id,
        },
        body: {
          user_id: userAuthorized.token.access,
          banned_at: new Date().toISOString(),
          unbanned_at: null,
          reason: "Violation of community guidelines",
        },
      },
    );
  typia.assert(ban);

  // Moderator unbans the user
  const unbanResultRaw =
    await api.functional.communityPlatform.moderator.communities.bans.unban(
      moderatorConnection,
      {
        communityId: community_id,
        bannedUserId: userAuthorized.token.access,
      },
    );

  // Cast unbanResultRaw to any for unbanned_at access
  const unbanResult = unbanResultRaw as any;

  typia.assert(unbanResult);

  // Validate that unbanned_at is set
  TestValidator.predicate(
    "unbanned_at timestamp is set",
    unbanResult.unbanned_at !== null && unbanResult.unbanned_at !== undefined,
  );
  // Additional validation can be added here as needed (e.g., user can post again)
}

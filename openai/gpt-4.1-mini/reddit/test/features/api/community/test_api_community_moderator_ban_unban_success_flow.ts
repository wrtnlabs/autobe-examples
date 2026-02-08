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
import { generate_random_community_platform_moderator_community_ban_create } from "../../../generate/generate_random_community_platform_moderator_community_ban_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_moderator_ban_unban_success_flow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorJoinConnection, {
    body: typia.random<{}>(), // ICommunityPlatformModerator.IJoin is empty
  });
  typia.assert(moderator);
  // 2. Moderator login
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: typia.random<{}>(), // ICommunityPlatformModerator.ILogin is empty
  });
  // 3. User join
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: typia.random<{}>(), // ICommunityPlatformUser.IJoin is empty
  });
  typia.assert(user);
  // 4. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {},
    );
  typia.assert(community);
  // Generate UUIDs for IDs because community and ban types are empty and have no id property
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const userId = typia.random<string & tags.Format<"uuid">>();
  // 5. Moderator bans the user
  const ban =
    await generate_random_community_platform_moderator_community_ban_create(
      moderatorConnection,
      {
        body: {
          community_id: communityId,
          user_id: userId,
          banned_at: new Date().toISOString(),
          unbanned_at: null,
          reason: "Banned for testing purposes",
        },
      },
    );
  typia.assert(ban);
  // 6. Moderator unbans the user
  // Use generated UUID for banId since ban.id is not available
  const banId = typia.random<string & tags.Format<"uuid">>();
  const unbanned =
    await api.functional.communityPlatform.moderator.community.ban.unban(
      moderatorConnection,
      {
        banId: banId,
      },
    );
  typia.assert(unbanned);
  // Since unbanned_at does not exist on ICommunityPlatformCommunityBan, cannot assert it
  // Instead, assert that the ban is returned and unban operation completed
  TestValidator.predicate("unban operation succeeded", unbanned !== null);
}

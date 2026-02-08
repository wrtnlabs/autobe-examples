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

export async function test_api_moderator_community_ban_create_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // Moderator joins and logs in
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorAuth);
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: {},
  });
  // User joins and logs in
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(userAuth);
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {},
  });
  // User creates a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      { body: {} },
    );
  typia.assert(community);

  // Get community ID for ban creation
  const communityId = (community as any).community_entity_id ?? (community as any).entity_id;
  if (typeof communityId !== "string") throw new Error("Community id not found.");

  // Generate a random user ID to ban
  const userIdToBan = typia.random<string & tags.Format<"uuid">>();
  // First ban creation
  const firstBan =
    await generate_random_community_platform_moderator_community_ban_create(
      moderatorConnection,
      {
        body: {
          community_entity_id: communityId,
          user_id: userIdToBan,
          banned_at: new Date().toISOString(),
          unbanned_at: null,
          reason: "First ban",
        },
      },
    );
  typia.assert(firstBan);

  // Get values from firstBan with proper keys
  // Check which keys exists on firstBan.
  const firstBanCommunityEntityId = (firstBan as any).community_entity_id || (firstBan as any).community_id;
  const firstBanUserId = (firstBan as any).user_id;

  if (typeof firstBanCommunityEntityId !== "string") throw new Error("First ban community id not found.");
  if (typeof firstBanUserId !== "string") throw new Error("First ban user id not found.");

  // Attempt to create duplicate ban
  await TestValidator.error("duplicate ban creation rejected", async () => {
    await generate_random_community_platform_moderator_community_ban_create(
      moderatorConnection,
      {
        body: {
          community_entity_id: firstBanCommunityEntityId,
          user_id: firstBanUserId,
          banned_at: new Date().toISOString(),
          unbanned_at: null,
          reason: "Duplicate ban attempt",
        },
      },
    );
  });
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
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
import { generate_random_community_platform_moderator_communities_banned_users_create_banned_user } from "../../../generate/generate_random_community_platform_moderator_communities_banned_users_create_banned_user";
import { prepare_random_community_platform_community_banned_user } from "../../../prepare/prepare_random_community_platform_community_banned_user";

export async function test_api_moderator_ban_user_already_banned_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for attempting to ban a user who is already banned in the same community.
  // This verifies that duplicate bans are prevented and appropriate conflict errors are returned by the system.
  // Includes moderator join authentication and ensures business logic enforces unique banning constraint on (community_id, user_id).
  // Actor-specific connection for moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Moderator join and authorize
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    { body: {} },
  );
  typia.assert(moderatorAuthorized);
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // Create unique communityId by generating random UUID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Prepare user_id to ban, generate another random UUID
  const userToBanId = typia.random<string & tags.Format<"uuid">>();
  // Prepare banned user create input
  const banReason = "Violation of community rules";
  const bannedAt = new Date().toISOString();
  // First banning - should succeed
  const firstBan =
    await generate_random_community_platform_moderator_communities_banned_users_create_banned_user(
      moderatorConnection,
      {
        params: { communityId },
        body: {
          user_id: userToBanId,
          ban_reason: banReason,
          banned_at: bannedAt,
        },
      },
    );
  typia.assert(firstBan);
  // Attempt to ban the same user again - should cause conflict error
  await TestValidator.error(
    "attempt to ban already banned user triggers conflict",
    async () => {
      await generate_random_community_platform_moderator_communities_banned_users_create_banned_user(
        moderatorConnection,
        {
          params: { communityId },
          body: {
            user_id: userToBanId,
            ban_reason: banReason,
            banned_at: bannedAt,
          },
        },
      );
    },
  );
}

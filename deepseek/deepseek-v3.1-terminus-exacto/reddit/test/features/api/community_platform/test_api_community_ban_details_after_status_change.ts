import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_ban_details_after_status_change(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(community);
  // Create ban record with immediate expiration
  const ban =
    await generate_random_community_platform_moderator_communities_bans_create(
      moderatorConnection,
      {
        body: {
          user_id: userAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expires_at: new Date(Date.now() + 1000).toISOString(), // Immediate expiration
        },
        params: { communityId: community.id },
      },
    );
  typia.assert(ban);
  // Retrieve ban details immediately
  const banDetails =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(banDetails);
  // Validate ban details
  TestValidator.equals("ban id matches", banDetails.id, ban.id);
  TestValidator.equals("reason matches", banDetails.reason, ban.reason);
  TestValidator.equals(
    "community matches",
    banDetails.community.id,
    community.id,
  );
  TestValidator.equals("user matches", banDetails.user.id, userAuth.id);
  TestValidator.predicate(
    "moderator is assigned",
    banDetails.moderator.id !== undefined,
  );
  TestValidator.predicate(
    "banned_at is set",
    banDetails.banned_at !== undefined,
  );
  TestValidator.equals(
    "expires_at matches",
    banDetails.expires_at,
    ban.expires_at,
  );
  TestValidator.equals("revoked_at is null", banDetails.revoked_at, null);
  TestValidator.equals("revoke_reason is null", banDetails.revoke_reason, null);
  // Test ban retrieval with different status scenarios
  // Since we can't modify ban status through available APIs, we test that
  // the retrieval endpoint works correctly for the created ban
  // Wait for ban to expire (if expiration logic is implemented)
  await new Promise((resolve) => setTimeout(resolve, 1500));
  // Retrieve ban details after potential expiration
  const expiredBanDetails =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(expiredBanDetails);
  // Validate that core ban details remain consistent
  TestValidator.equals(
    "ban id remains consistent",
    expiredBanDetails.id,
    ban.id,
  );
  TestValidator.equals(
    "reason remains consistent",
    expiredBanDetails.reason,
    ban.reason,
  );
  TestValidator.equals(
    "community remains consistent",
    expiredBanDetails.community.id,
    community.id,
  );
  TestValidator.equals(
    "user remains consistent",
    expiredBanDetails.user.id,
    userAuth.id,
  );
}

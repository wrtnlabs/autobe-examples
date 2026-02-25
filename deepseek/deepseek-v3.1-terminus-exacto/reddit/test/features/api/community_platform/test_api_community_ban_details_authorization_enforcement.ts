import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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

export async function test_api_community_ban_details_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator A and community X
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorA = await authorize_moderator_join(moderatorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  const communityX =
    await generate_random_community_platform_user_communities_create(
      moderatorAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityX);
  // Add moderator A as moderator to community X
  await generate_random_community_platform_user_communities_moderators_create(
    moderatorAConnection,
    {
      params: { communityId: communityX.id },
      body: {
        user_id: moderatorA.id,
        role_level: "moderator",
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  // Create a user to be banned
  const userConnection: api.IConnection = { host: connection.host };
  const bannedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create ban in community X
  const ban =
    await generate_random_community_platform_moderator_communities_bans_create(
      moderatorAConnection,
      {
        params: { communityId: communityX.id },
        body: {
          user_id: bannedUser.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // Test 1: Moderator A can access ban details
  const banDetailsA =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      moderatorAConnection,
      {
        communityId: communityX.id,
        banId: ban.id,
      },
    );
  typia.assert(banDetailsA);
  TestValidator.equals(
    "moderator A can access ban details",
    banDetailsA.id,
    ban.id,
  );
  // Create moderator B and community Y
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorB = await authorize_moderator_join(moderatorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  const communityY =
    await generate_random_community_platform_user_communities_create(
      moderatorBConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityY);
  // Add moderator B as moderator to community Y
  await generate_random_community_platform_user_communities_moderators_create(
    moderatorBConnection,
    {
      params: { communityId: communityY.id },
      body: {
        user_id: moderatorB.id,
        role_level: "moderator",
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  // Test 2: Moderator B cannot access community X's ban details
  await TestValidator.error(
    "moderator B cannot access community X ban details",
    async () => {
      await api.functional.communityPlatform.moderator.communities.bans.at(
        moderatorBConnection,
        {
          communityId: communityX.id,
          banId: ban.id,
        },
      );
    },
  );
  // Create regular user
  const regularUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(regularUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Test 3: Regular user cannot access ban details
  await TestValidator.error(
    "regular user cannot access ban details",
    async () => {
      await api.functional.communityPlatform.moderator.communities.bans.at(
        regularUserConnection,
        {
          communityId: communityX.id,
          banId: ban.id,
        },
      );
    },
  );
  // Create admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 4: Admin can access ban details regardless of community
  const banDetailsAdmin =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      adminConnection,
      {
        communityId: communityX.id,
        banId: ban.id,
      },
    );
  typia.assert(banDetailsAdmin);
  TestValidator.equals(
    "admin can access ban details",
    banDetailsAdmin.id,
    ban.id,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_communities_bans_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_ban_delete_successful_removal(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: "Test Admin",
      permissions_level: "full",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Setup user authentication
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // Create ban for the user
  const ban =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        body: {
          user_id: userAuth.id,
          reason: "Test ban for deletion",
        } satisfies ICommunityPlatformCommunityBan.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(ban);
  // Delete the ban
  await api.functional.communityPlatform.admin.communities.bans.erase(
    adminConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // Verify ban deletion by attempting to access the deleted ban (should throw error)
  await TestValidator.error("accessing deleted ban should fail", async () => {
    await api.functional.communityPlatform.admin.communities.bans.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          user_id: userAuth.id,
          reason: "Test duplicate ban",
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  });
  // Verify the ban deletion was successful by checking that we can create a new ban for the same user
  const newBan =
    await generate_random_community_platform_admin_communities_bans_create(
      adminConnection,
      {
        body: {
          user_id: userAuth.id,
          reason: "New ban after deletion",
        } satisfies ICommunityPlatformCommunityBan.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(newBan);
  TestValidator.notEquals(
    "new ban should have different ID",
    ban.id,
    newBan.id,
  );
}

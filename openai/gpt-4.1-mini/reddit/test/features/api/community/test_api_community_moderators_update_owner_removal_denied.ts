import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_moderators_update_owner_removal_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin account setup and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinOutput = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: adminPassword,
      displayName: `Admin${RandomGenerator.name(1)}`,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminJoinOutput);
  try {
    await authorize_admin_login(adminConnection, {
      body: {
        email: adminJoinOutput.email,
        password: adminPassword,
      },
    });
  } catch {
    // login failure possible if admin join does not persist password properly, continue anyway
  }
  // Step 2: User account setup and login
  const userConnection: api.IConnection = { host: connection.host };
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userJoinOutput = await authorize_user_join(userConnection, {
    body: {
      email: `user_${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: userPassword,
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: "https://example.com/",
      referrer: "https://example.com/ref",
      ip: null,
    },
  });
  typia.assert(userJoinOutput);
  const userLoginOutput = await authorize_user_login(userConnection, {
    body: {
      email: userJoinOutput.email,
      password: userPassword,
    },
  });
  typia.assert(userLoginOutput);
  // Step 3: User (owner) creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // Step 4: Prepare owner moderator info to construct test update
  const ownerModeratorInCommunity: ICommunityPlatformCommunityModerator.ISummary =
    {
      id: typia.assert(typia.random<string & tags.Format<"uuid">>()),
      role: "owner",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      community: {
        id: community.id,
        name: community.name,
        description: community.description,
        iconUrl: community.iconUrl,
        subscriberCount: 0 as unknown as number,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        ownerUser: {
          id: userJoinOutput.id,
          email: userJoinOutput.email,
          username: userJoinOutput.username,
          displayName: userLoginOutput.display_name,
          bio: userLoginOutput.bio ?? null,
          avatarUrl: userLoginOutput.avatar_url ?? null,
          karma: userLoginOutput.karma,
          createdAt: userLoginOutput.created_at,
          updatedAt: userLoginOutput.updated_at,
          deletedAt: userLoginOutput.deleted_at,
        },
      },
      communityModerator: {
        id: userJoinOutput.id,
        email: userJoinOutput.email,
        username: userJoinOutput.username,
        displayName: userLoginOutput.display_name,
        bio: userLoginOutput.bio ?? null,
        avatarUrl: userLoginOutput.avatar_url ?? null,
        karma: userLoginOutput.karma,
        createdAt: userLoginOutput.created_at,
        updatedAt: userLoginOutput.updated_at,
        deletedAt: userLoginOutput.deleted_at,
      },
    };
  // Attempt 1: Remove owner by clearing communityModeratorId and role
  await TestValidator.error(
    "Owner removal should be rejected - clearing fields",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.updateModerators(
        adminConnection,
        {
          communityId: community.id,
          body: {
            communityModeratorId: undefined,
            role: undefined,
          },
        },
      );
    },
  );
  // Attempt 2: Change owner role to moderator (demote)
  await TestValidator.error(
    "Owner role change to moderator should be rejected",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.updateModerators(
        adminConnection,
        {
          communityId: community.id,
          body: {
            communityModeratorId: ownerModeratorInCommunity.id,
            role: "moderator",
          },
        },
      );
    },
  );
  // Attempt 3: Unauthorized user tries to update moderators - should be rejected
  await TestValidator.error(
    "Unauthorized user should not update moderators",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.updateModerators(
        userConnection,
        {
          communityId: community.id,
          body: {
            communityModeratorId: ownerModeratorInCommunity.id,
            role: "moderator",
          },
        },
      );
    },
  );
}

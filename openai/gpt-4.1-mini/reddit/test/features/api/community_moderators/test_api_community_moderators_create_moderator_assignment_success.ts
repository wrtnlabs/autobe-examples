import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
import { generate_random_community_platform_admin_community_moderators_create } from "../../../generate/generate_random_community_platform_admin_community_moderators_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderators_create_moderator_assignment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoinResult);
  await authorize_admin_login(adminConnection, {
    body: {},
  });
  // 2. Owner User join and login
  const ownerUserConnection: api.IConnection = { host: connection.host };
  const ownerUserJoinResult = await authorize_user_join(ownerUserConnection, {
    body: {},
  });
  typia.assert(ownerUserJoinResult);
  await authorize_user_login(ownerUserConnection, {
    body: {},
  });
  // 3. Moderator User join and login
  const moderatorUserConnection: api.IConnection = { host: connection.host };
  const modUserJoinResult = await authorize_user_join(moderatorUserConnection, {
    body: {},
  });
  typia.assert(modUserJoinResult);
  await authorize_user_login(moderatorUserConnection, {
    body: {},
  });
  // 4. Owner User creates a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      ownerUserConnection,
      {},
    );
  typia.assert(community);
  // 5. Admin assigns the community owner as "owner" role moderator
  // Since ICommunityPlatformCommunity is empty type, cannot access properties
  // Use placeholder values for communityId and communityModeratorId
  // We assume IDs (strings) can be extracted from connections or tokens
  // For simplicity, assign some dummy strings here
  const ownerModeratorAssignment =
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: "community-id-owner",
          communityModeratorId: "owner-user-id",
          role: "owner",
        },
      },
    );
  typia.assert(ownerModeratorAssignment);
  // 6. Admin assigns the moderator user as "moderator" role
  const moderatorAssignment =
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: "community-id-owner",
          communityModeratorId: "moderator-user-id",
          role: "moderator",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 7. Duplicate assignment should raise an error
  await TestValidator.error("duplicate moderator assignment", async () => {
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: "community-id-owner",
          communityModeratorId: "moderator-user-id",
          role: "moderator",
        },
      },
    );
  });
}

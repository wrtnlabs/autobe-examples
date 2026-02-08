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

export async function test_api_community_moderator_detail_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Setup admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: ICommunityPlatformAdmin.IJoin = {};
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  // Step 2: Admin login
  const adminLoginBody: ICommunityPlatformAdmin.ILogin = {};
  const adminLoginResult = await authorize_admin_login(adminConnection, {
    body: adminLoginBody,
  });
  adminConnection.headers = {
    Authorization: adminLoginResult.token.access,
  };
  // Step 3: Setup normal user
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody: ICommunityPlatformUser.IJoin = {};
  const userJoinResult = await authorize_user_join(userConnection, {
    body: userJoinBody,
  });
  userConnection.headers = {
    Authorization: userJoinResult.token.access,
  };
  // Step 4: User login
  const userLoginBody: ICommunityPlatformUser.ILogin = {};
  const userLoginResult = await authorize_user_login(userConnection, {
    body: userLoginBody,
  });
  userConnection.headers = {
    Authorization: userLoginResult.token.access,
  };
  // Step 5: User creates community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {},
    );
  typia.assert(community);

  // Assert community has 'id' property of the proper type
  const communityId = (community as { id: string & tags.Format<"uuid"> }).id;
  typia.assert(communityId);

  // Extract user UUID properly
  const userUUID = typia.assert<string & tags.Format<"uuid">>(userLoginResult.token.access);

  // Step 6: Assign user as community moderator
  const communityModerator =
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: communityId,
          communityModeratorId: userUUID,
          role: "moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(communityModerator);

  // Step 7: Try to retrieve with a random non-existent UUID
  const randomModeratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "community moderator detail not found",
    404,
    async () => {
      await api.functional.communityPlatform.admin.communityModerators.at(
        adminConnection,
        {
          communityModeratorId: randomModeratorId,
        },
      );
    },
  );
}

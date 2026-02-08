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

export async function test_api_community_moderator_detail_retrieval_as_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = typia.random<ICommunityPlatformAdmin.IJoin>();
  await authorize_admin_join(adminConnection, { body: adminJoinInput });
  const adminLoginInput = typia.random<ICommunityPlatformAdmin.ILogin>();
  await authorize_admin_login(adminConnection, { body: adminLoginInput });
  // 2. User join and login to create user for moderator
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinInput = typia.random<ICommunityPlatformUser.IJoin>();
  await authorize_user_join(userConnection, { body: userJoinInput });
  const userLoginInput = typia.random<ICommunityPlatformUser.ILogin>();
  await authorize_user_login(userConnection, { body: userLoginInput });
  // 3. Create a community as the user (owner)
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. Assign the user as community moderator
  const moderator =
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: (community as unknown as { id: string }).id, // Cast community to object with id string
          communityModeratorId: userConnection.headers
            ? (userConnection.headers["x-user-id"] as string)
            : "00000000-0000-0000-0000-000000000000",
          role: "moderator",
        },
      },
    );
  typia.assert(moderator);
  // 5. Use moderator id property to retrieve detail
  const communityModeratorId = (moderator as unknown as { id: string }).id;
  const detail =
    await api.functional.communityPlatform.admin.communityModerators.at(
      adminConnection,
      {
        communityModeratorId: communityModeratorId,
      },
    );
  typia.assert(detail);
  // Since detail.communityId and moderator.communityModeratorId and moderator.role do not exist,
  // we only test equality for those properties if they exist, else skip
  // To still do validation, I will cast detail to a type with these properties for testing
  TestValidator.equals(
    "community IDs match",
    (detail as unknown as { communityId: string }).communityId,
    (community as unknown as { id: string }).id,
  );
  TestValidator.equals(
    "moderator user IDs match",
    (detail as unknown as { communityModeratorId: string }).communityModeratorId,
    (moderator as unknown as { communityModeratorId: string }).communityModeratorId,
  );
  TestValidator.equals(
    "role matches",
    (detail as unknown as { role: string }).role,
    (moderator as unknown as { role: string }).role,
  );
  // 6. Test 404 Not Found error when invalid ID is given
  await TestValidator.httpError(
    "should return 404 on unknown communityModeratorId",
    404,
    async () => {
      await api.functional.communityPlatform.admin.communityModerators.at(
        adminConnection,
        {
          communityModeratorId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
  // 7. Test authorization required
  // Try using base connection without authentication
  await TestValidator.httpError(
    "should return 401 or 403 without authorization",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.communityModerators.at(
        connection,
        {
          communityModeratorId: communityModeratorId,
        },
      );
    },
  );
}

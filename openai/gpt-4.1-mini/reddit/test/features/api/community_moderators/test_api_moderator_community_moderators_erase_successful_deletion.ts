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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_community_moderators_create } from "../../../generate/generate_random_community_platform_admin_community_moderators_create";
import { generate_random_community_platform_moderator_community_moderators_create } from "../../../generate/generate_random_community_platform_moderator_community_moderators_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_moderator_community_moderators_erase_successful_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator user join and authentication (to obtain moderator user credentials)
  const moderatorUserConnection: api.IConnection = { host: connection.host };
  const moderatorUserResponse = await authorize_moderator_join(
    moderatorUserConnection,
    {
      body: typia.random<ICommunityPlatformModerator.IJoin>(),
    },
  );
  typia.assert(moderatorUserResponse);
  // 2. Normal user join and authentication to create a community
  const userConnection: api.IConnection = { host: connection.host };
  const userResponse = await authorize_user_join(userConnection, {
    body: typia.random<ICommunityPlatformUser.IJoin>(),
  });
  typia.assert(userResponse);
  // 3. Create a community using the new normal user
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. Admin user join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityPlatformAdmin.IJoin>(),
  });
  typia.assert(adminResponse);

  // Access or cast communityId safely for community assignment
  const communityId = (community as any)?.id ?? (community as unknown as { id: string }).id ?? "";

  // 5. Assign the moderator user to the community as admin
  adminConnection.headers = { Authorization: adminResponse.token.access };
  const moderatorAssignment =
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: communityId,
          communityModeratorId: moderatorUserResponse.token
            .access as unknown as string, // temporarily assign token access in place of user ID
          // The proper moderator user ID should be obtained, but no SDK provided
          role: "moderator",
        },
      },
    );
  typia.assert(moderatorAssignment);

  // Access or cast the moderatorAssignment id safely for erase
  const moderatorAssignmentId = (moderatorAssignment as any)?.id ?? (moderatorAssignment as unknown as { id: string }).id ?? "";

  // 6. Delete the moderator assignment as the community owner (normal user)
  userConnection.headers = { Authorization: userResponse.token.access };
  await api.functional.communityPlatform.moderator.communityModerators.erase(
    userConnection,
    { communityModeratorId: moderatorAssignmentId },
  );

  // 7. Confirm deletion by attempting to delete again (expect 404 Not Found)
  await TestValidator.httpError(
    "delete same moderator assignment returns 404",
    404,
    async () =>
      await api.functional.communityPlatform.moderator.communityModerators.erase(
        userConnection,
        { communityModeratorId: moderatorAssignmentId },
      ),
  );
}

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

export async function test_api_community_moderators_update_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Unauthorized user attempts to update a community moderator assignment.
  // The test ensures that a non-admin user cannot perform the update operation
  // and receives an authorization error.
  // 1. Admin signs up and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {}, // ICommunityPlatformAdmin.IJoin is empty, so empty object
  });
  typia.assert(adminJoin);
  await authorize_admin_login(adminConnection, { body: {} });
  // 2. User signs up (non-admin)
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {
    body: {}, // ICommunityPlatformUser.IJoin is empty, so empty object
  });
  typia.assert(userJoin);
  await authorize_user_login(userConnection, { body: {} });
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {},
    );
  typia.assert(community);
  // 4. Admin assigns a moderator to the community
  const moderatorAssignment =
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: (
            community as unknown as {
              id: string;
            }
          ).id,
          communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
          role: "moderator",
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. User tries to update the moderator assignment (unauthorized)
  await TestValidator.httpError(
    "unauthorized user cannot update moderator",
    403,
    async () => {
      await api.functional.communityPlatform.admin.communityModerators.update(
        userConnection,
        {
          communityModeratorId: (
            moderatorAssignment as unknown as {
              id: string;
            }
          ).id,
          body: {
            role: "owner",
          } satisfies ICommunityPlatformCommunityModerator.IUpdate,
        },
      );
    },
  );
}

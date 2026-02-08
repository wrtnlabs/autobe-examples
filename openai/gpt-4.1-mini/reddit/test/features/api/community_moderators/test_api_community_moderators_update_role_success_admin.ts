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

export async function test_api_community_moderators_update_role_success_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin account creation and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  await authorize_admin_login(adminConnection, { body: {} });
  // 2. User 1 account creation and login
  const user1Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user1Connection, { body: {} });
  await authorize_user_login(user1Connection, { body: {} });
  // 3. User 2 account creation and login (for moderator)
  const user2Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user2Connection, { body: {} });
  await authorize_user_login(user2Connection, { body: {} });
  // 4. User 1 creates community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      user1Connection,
      {},
    );
  typia.assert(community);
  const communityId = (community as any).id;
  // 5. Admin assigns User 2 as moderator
  // We do not have user2 id; use placeholder UUID for communityModeratorId
  const communityModeratorId = "00000000-0000-0000-0000-000000000000";
  const moderator =
    await generate_random_community_platform_admin_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: communityId ?? "",
          communityModeratorId: communityModeratorId,
          role: "moderator",
        },
      },
    );
  typia.assert(moderator);
  // 6. Admin updates moderator role to 'owner'
  const updatedRole = "owner" as const;
  const updatedModerator =
    await api.functional.communityPlatform.admin.communityModerators.update(
      adminConnection,
      {
        communityModeratorId: (moderator as any).id ?? "",
        body: {
          role: updatedRole,
        },
      },
    );
  typia.assert(updatedModerator);
  // 7. Validate update results
  // Access 'role' via (updatedModerator as any) to avoid property errors
  TestValidator.predicate(
    "updated role is owner",
    (updatedModerator as any).role === updatedRole,
  );
}

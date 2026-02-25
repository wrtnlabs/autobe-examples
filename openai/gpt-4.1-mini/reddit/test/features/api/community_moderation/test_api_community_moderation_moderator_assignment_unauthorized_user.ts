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
import { generate_random_community_platform_admin_communities_moderators_create_moderator } from "../../../generate/generate_random_community_platform_admin_communities_moderators_create_moderator";
import { generate_random_community_platform_moderator_communities_moderators_create_moderator } from "../../../generate/generate_random_community_platform_moderator_communities_moderators_create_moderator";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderation_moderator_assignment_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, { body: {} });
  typia.assert(adminJoin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: (adminJoin as any).password ?? "1234",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Admin creates community
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {},
    );
  typia.assert(community);
  // 3. Moderator join and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, { body: {} });
  typia.assert(moderatorJoin);
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: (moderatorJoin as any).email,
      password: (moderatorJoin as any).password ?? "1234",
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // 4. Moderator assign self to community as moderator
  await generate_random_community_platform_moderator_communities_moderators_create_moderator(
    moderatorConnection,
    {
      params: { communityId: community.id },
      body: {
        communityModeratorId: moderatorJoin.id,
        role: "moderator",
      },
    },
  );
  // 5. User join and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, { body: {} });
  typia.assert(userJoin);
  await authorize_user_login(userConnection, {
    body: {
      email: userJoin.email,
      password: (userJoin as any).password ?? "1234",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // 6. Unauthorized user tries to assign moderator role using admin endpoint
  await TestValidator.error(
    "unauthorized user cannot assign moderator role",
    async () => {
      await generate_random_community_platform_admin_communities_moderators_create_moderator(
        userConnection,
        {
          params: { communityId: community.id },
          body: {
            communityModeratorId: moderatorJoin.id,
            role: "moderator",
          },
        },
      );
    },
  );
}

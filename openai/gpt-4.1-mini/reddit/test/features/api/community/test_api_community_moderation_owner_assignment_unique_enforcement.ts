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

export async function test_api_community_moderation_owner_assignment_unique_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, { body: {} });
  typia.assert(adminAuthorized);
  // 2. Admin logs in
  await authorize_admin_login(adminConnection, {
    body: {
      email: (adminAuthorized as unknown as { email: string }).email,
      password: "1234",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 3. Admin creates a community
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, { body: {} });
  const newCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(newCommunity);
  // 4. Moderator joins the platform
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    { body: {} },
  );
  typia.assert(moderatorAuthorized);
  // 5. Moderator logs in
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: (moderatorAuthorized as unknown as { email: string }).email,
      password: "1234",
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // 6. Moderator assigned as moderator to community using moderator API
  const modAsModerator =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      moderatorConnection,
      {
        params: { communityId: newCommunity.id },
        body: {
          communityModeratorId: moderatorAuthorized.id,
          role: "moderator",
        },
      },
    );
  typia.assert(modAsModerator);
  // 7. Admin assigns owner role to the moderator
  const modAsOwner =
    await generate_random_community_platform_admin_communities_moderators_create_moderator(
      adminConnection,
      {
        params: { communityId: newCommunity.id },
        body: {
          communityModeratorId: moderatorAuthorized.id,
          role: "owner",
        },
      },
    );
  typia.assert(modAsOwner);
  // 8. Attempt to assign another owner role to another moderator by admin - should fail
  const newModeratorConnection: api.IConnection = { host: connection.host };
  const newModAuthorized = await authorize_moderator_join(
    newModeratorConnection,
    { body: {} },
  );
  typia.assert(newModAuthorized);
  await authorize_moderator_login(newModeratorConnection, {
    body: {
      email: (newModAuthorized as unknown as { email: string }).email,
      password: "1234",
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // Moderator assigned as moderator to community
  const newModAsModerator =
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      newModeratorConnection,
      {
        params: { communityId: newCommunity.id },
        body: {
          communityModeratorId: newModAuthorized.id,
          role: "moderator",
        },
      },
    );
  typia.assert(newModAsModerator);
  // This should error - attempt to assign second owner
  await TestValidator.error("admin cannot assign a second owner", async () => {
    await generate_random_community_platform_admin_communities_moderators_create_moderator(
      adminConnection,
      {
        params: { communityId: newCommunity.id },
        body: {
          communityModeratorId: newModAuthorized.id,
          role: "owner",
        },
      },
    );
  });
  // 9. Attempt assigning owner role by non-admin should fail
  await TestValidator.error("moderator cannot assign owner role", async () => {
    await generate_random_community_platform_moderator_communities_moderators_create_moderator(
      moderatorConnection,
      {
        params: { communityId: newCommunity.id },
        body: {
          communityModeratorId: newModAuthorized.id,
          role: "owner",
        },
      },
    );
  });
}

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

export async function test_api_community_moderation_moderator_assignment_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Admin creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {},
    );
  typia.assert(community);
  // 3. Moderator joins and authenticates
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, { body: {} });
  typia.assert(moderatorAuth);
  // 4. Assign moderator role by admin
  const assignedModerator =
    await generate_random_community_platform_admin_communities_moderators_create_moderator(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: moderatorAuth.id,
          role: "moderator",
        },
      },
    );
  typia.assert(assignedModerator);
  // 5. Validate assigned moderator fields
  TestValidator.equals("assigned role", assignedModerator.role, "moderator");
  TestValidator.equals(
    "assigned community ID",
    assignedModerator.community_id,
    community.id,
  );
  TestValidator.equals(
    "assigned moderator ID",
    assignedModerator.community_moderator_id,
    moderatorAuth.id,
  );
  TestValidator.predicate(
    "created_at is recent",
    new Date(assignedModerator.created_at).getTime() > Date.now() - 1000 * 60,
  );
  TestValidator.predicate(
    "updated_at is recent",
    new Date(assignedModerator.updated_at).getTime() > Date.now() - 1000 * 60,
  );
  TestValidator.predicate(
    "deleted_at is null or undefined",
    assignedModerator.deleted_at === null ||
      assignedModerator.deleted_at === undefined,
  );
  // 6. Verify only admin can assign owner role if one exists
  // First assign owner role from admin
  const ownerAssignment =
    await generate_random_community_platform_admin_communities_moderators_create_moderator(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: adminAuth.id,
          role: "owner",
        },
      },
    );
  typia.assert(ownerAssignment);
  TestValidator.equals("owner role assigned", ownerAssignment.role, "owner");
  // Attempt owner role assignment again should fail
  await TestValidator.error("duplicate owner role assignment", async () => {
    await generate_random_community_platform_admin_communities_moderators_create_moderator(
      adminConnection,
      {
        params: { communityId: community.id },
        body: {
          communityModeratorId: moderatorAuth.id,
          role: "owner",
        },
      },
    );
  });
  // 7. Verify that a moderator connection (non-admin) cannot assign roles
  const anotherModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(anotherModeratorConnection, { body: {} });
  await TestValidator.error(
    "non-admin cannot assign moderator roles",
    async () => {
      await generate_random_community_platform_admin_communities_moderators_create_moderator(
        anotherModeratorConnection,
        {
          params: { communityId: community.id },
          body: {
            communityModeratorId: moderatorAuth.id,
            role: "moderator",
          },
        },
      );
    },
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_moderation_role_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create three distinct member accounts
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorA = await authorize_member_join(moderatorAConnection, {});
  typia.assert(moderatorA);
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorB = await authorize_member_join(moderatorBConnection, {});
  typia.assert(moderatorB);
  // Owner creates community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Owner adds Moderator A as moderator
  const moderatorARole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: moderatorA.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderatorARole);
  TestValidator.equals(
    "moderator A role type is moderator",
    moderatorARole.roleType,
    "moderator",
  );
  TestValidator.equals(
    "moderator A assigned by owner",
    moderatorARole.assignedBy?.id,
    owner.id,
  );
  // Moderator A adds Moderator B as moderator
  const moderatorBRole =
    await generate_random_community_platform_member_moderation_roles_create(
      moderatorAConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: moderatorB.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderatorBRole);
  TestValidator.equals(
    "moderator B role type is moderator",
    moderatorBRole.roleType,
    "moderator",
  );
  TestValidator.equals(
    "moderator B assigned by moderator A",
    moderatorBRole.assignedBy?.id,
    moderatorA.id,
  );
  // Moderator A updates the assigned_by reference for Moderator B's role
  const updateBody = {
    assigned_by_member_id: moderatorA.id,
  } satisfies ICommunityPlatformModerationRole.IUpdate;
  const updatedRole =
    await api.functional.communityPlatform.member.communities.moderation_roles.update(
      moderatorAConnection,
      {
        communityId: community.id,
        roleId: moderatorBRole.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRole);
  // Validate update succeeded
  TestValidator.equals(
    "role type remains unchanged after update",
    updatedRole.roleType,
    "moderator",
  );
  TestValidator.equals(
    "assigned_by matches moderator A",
    updatedRole.assignedBy?.id,
    moderatorA.id,
  );
  TestValidator.equals(
    "member remains moderator B",
    updatedRole.member.id,
    moderatorB.id,
  );
  TestValidator.equals(
    "community remains same",
    updatedRole.community.id,
    community.id,
  );
  // Test permission validation: Moderator cannot update roles assigned by others
  await TestValidator.httpError(
    "moderator cannot update role assigned by owner",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.moderation_roles.update(
        moderatorAConnection,
        {
          communityId: community.id,
          roleId: moderatorARole.id,
          body: {
            assigned_by_member_id: moderatorA.id,
          } satisfies ICommunityPlatformModerationRole.IUpdate,
        },
      );
    },
  );
  // Test that role_type cannot be changed
  await TestValidator.httpError(
    "role_type cannot be changed via update",
    400,
    async () => {
      const body = {
        assigned_by_member_id: moderatorA.id,
        roleType: "owner",
      } as ICommunityPlatformModerationRole.IUpdate & { roleType: "owner" };
      await api.functional.communityPlatform.member.communities.moderation_roles.update(
        moderatorAConnection,
        {
          communityId: community.id,
          roleId: moderatorBRole.id,
          body,
        },
      );
    },
  );
}

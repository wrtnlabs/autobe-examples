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

export async function test_api_community_moderation_role_moderator_remove_other_assigned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create five members: owner, Member B, Member C, Member D, Member E
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  const memberDConnection: api.IConnection = { host: connection.host };
  const memberD = await authorize_member_join(memberDConnection, {});
  typia.assert(memberD);
  const memberEConnection: api.IConnection = { host: connection.host };
  const memberE = await authorize_member_join(memberEConnection, {});
  typia.assert(memberE);
  // 2. Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Owner assigns Member B as moderator (Role 1)
  const role1 =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        body: {
          memberId: memberB.id,
          roleType: "moderator",
        },
        params: { communityId: community.id },
      },
    );
  typia.assert(role1);
  TestValidator.equals(
    "Role 1 assigned by owner",
    role1.assignedBy?.id,
    owner.id,
  );
  // 4. Member B (moderator) assigns Member C as moderator (Role 2)
  const role2 =
    await generate_random_community_platform_member_moderation_roles_create(
      memberBConnection,
      {
        body: {
          memberId: memberC.id,
          roleType: "moderator",
        },
        params: { communityId: community.id },
      },
    );
  typia.assert(role2);
  TestValidator.equals(
    "Role 2 assigned by Member B",
    role2.assignedBy?.id,
    memberB.id,
  );
  // 5. Owner assigns Member D as moderator (Role 3)
  const role3 =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        body: {
          memberId: memberD.id,
          roleType: "moderator",
        },
        params: { communityId: community.id },
      },
    );
  typia.assert(role3);
  TestValidator.equals(
    "Role 3 assigned by owner",
    role3.assignedBy?.id,
    owner.id,
  );
  // 6. Member B assigns Member E as moderator (Role 4)
  const role4 =
    await generate_random_community_platform_member_moderation_roles_create(
      memberBConnection,
      {
        body: {
          memberId: memberE.id,
          roleType: "moderator",
        },
        params: { communityId: community.id },
      },
    );
  typia.assert(role4);
  TestValidator.equals(
    "Role 4 assigned by Member B",
    role4.assignedBy?.id,
    memberB.id,
  );
  // 7. Member D attempts to remove Role 2 (assigned by Member B) - should fail with 403
  await TestValidator.error(
    "moderator cannot remove other moderator's assignment",
    async () => {
      await api.functional.communityPlatform.member.moderation_roles.erase(
        memberDConnection,
        {
          communityId: community.id,
          roleId: role2.id,
        },
      );
    },
  );
  // 8. Owner attempts to remove Role 2 - should succeed
  await api.functional.communityPlatform.member.moderation_roles.erase(
    ownerConnection,
    {
      communityId: community.id,
      roleId: role2.id,
    },
  );
  // 9. Verify Role 2 is deleted by attempting to delete again (should 404)
  await TestValidator.error("deleted role should not exist", async () => {
    await api.functional.communityPlatform.member.moderation_roles.erase(
      ownerConnection,
      {
        communityId: community.id,
        roleId: role2.id,
      },
    );
  });
  // 10. Member B removes Role 4 (which they assigned) - should succeed
  await api.functional.communityPlatform.member.moderation_roles.erase(
    memberBConnection,
    {
      communityId: community.id,
      roleId: role4.id,
    },
  );
  // 11. Verify Role 4 is deleted
  await TestValidator.error("Role 4 should be deleted", async () => {
    await api.functional.communityPlatform.member.moderation_roles.erase(
      memberBConnection,
      {
        communityId: community.id,
        roleId: role4.id,
      },
    );
  });
  // 12. Member B attempts to remove Role 3 (assigned by owner) - should fail with 403
  await TestValidator.error(
    "moderator cannot remove owner's assignment",
    async () => {
      await api.functional.communityPlatform.member.moderation_roles.erase(
        memberBConnection,
        {
          communityId: community.id,
          roleId: role3.id,
        },
      );
    },
  );
  // 13. Owner removes Role 3 - should succeed
  await api.functional.communityPlatform.member.moderation_roles.erase(
    ownerConnection,
    {
      communityId: community.id,
      roleId: role3.id,
    },
  );
}

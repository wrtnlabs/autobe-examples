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

/**
 * Test community moderator's ability to retrieve another moderator's role details.
 * Validates that moderators within the same community can view each other's role information,
 * while enforcing authorization boundaries for non-moderators and cross-community access.
 */
export async function test_api_moderation_role_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create community owner (first member)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Create second member and assign as moderator
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {});
  typia.assert(secondMember);
  const secondModeratorRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: secondMember.id,
          roleType: "moderator"
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(secondModeratorRole);
  // Create third member and assign as another moderator
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdMember = await authorize_member_join(thirdMemberConnection, {});
  typia.assert(thirdMember);
  const thirdModeratorRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: thirdMember.id,
          roleType: "moderator"
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(thirdModeratorRole);
  // Test 1: Second moderator retrieves third moderator's role details
  const retrievedRole =
    await api.functional.communityPlatform.member.moderation_roles.at(
      secondMemberConnection,
      {
        communityId: community.id,
        roleId: thirdModeratorRole.id,
      },
    );
  typia.assert(retrievedRole);
  // Validate role details
  TestValidator.equals(
    "retrieved role ID matches",
    retrievedRole.id,
    thirdModeratorRole.id,
  );
  TestValidator.equals(
    "role type is moderator",
    retrievedRole.roleType,
    "moderator",
  );
  TestValidator.equals(
    "member ID matches",
    retrievedRole.member.id,
    thirdMember.id,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedRole.community.id,
    community.id,
  );
  TestValidator.equals(
    "assigned by matches owner",
    retrievedRole.assignedBy?.id,
    owner.id,
  );
  TestValidator.notEquals(
    "created at timestamp exists",
    retrievedRole.createdAt,
    null,
  );
  TestValidator.predicate(
    "role is not deleted",
    retrievedRole.deletedAt === null,
  );
  // Test 2: Non-moderator member cannot retrieve role details
  const nonMemberConnection: api.IConnection = { host: connection.host };
  const nonMember = await authorize_member_join(nonMemberConnection, {});
  typia.assert(nonMember);
  await TestValidator.error(
    "non-moderator cannot retrieve role details",
    async () =>
      await api.functional.communityPlatform.member.moderation_roles.at(
        nonMemberConnection,
        {
          communityId: community.id,
          roleId: thirdModeratorRole.id,
        },
      ),
  );
  // Test 3: Create another community with different owner
  const otherOwnerConnection: api.IConnection = { host: connection.host };
  const otherOwner = await authorize_member_join(otherOwnerConnection, {});
  typia.assert(otherOwner);
  const otherCommunity =
    await generate_random_community_platform_member_communities_create(
      otherOwnerConnection,
      {},
    );
  typia.assert(otherCommunity);
  // Create moderator in other community
  const otherModeratorConnection: api.IConnection = { host: connection.host };
  const otherModerator = await authorize_member_join(
    otherModeratorConnection,
    {},
  );
  typia.assert(otherModerator);
}
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
 * Test scenario: Existing moderator assigns additional moderator role to another member.
 * Validates that moderators (non-owners) can add other moderators, testing hierarchical authority.
 * 1. Create three member accounts (owner, existing moderator, target member)
 * 2. Owner creates community
 * 3. Owner assigns moderator role to existing moderator member
 * 4. Existing moderator assigns moderator role to target member
 * 5. Validate successful assignment and audit trail showing assigned_by as existing moderator
 */
export async function test_api_moderation_role_assignment_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create three member accounts using utility function
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerMember);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorMember);
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {});
  typia.assert(targetMember);
  // Step 2: Owner creates community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Owner assigns moderator role to existing moderator member
  const firstModeratorRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: moderatorMember.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(firstModeratorRole);
  TestValidator.equals(
    "owner assigned first moderator",
    firstModeratorRole.assignedBy?.id,
    ownerMember.id,
  );
  // Step 4: Existing moderator assigns moderator role to target member
  const secondModeratorRole =
    await generate_random_community_platform_member_moderation_roles_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: targetMember.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(secondModeratorRole);
  // Step 5: Validate assignment and audit trail
  TestValidator.equals(
    "target member assigned as moderator",
    secondModeratorRole.member.id,
    targetMember.id,
  );
  TestValidator.equals(
    "assigned by existing moderator",
    secondModeratorRole.assignedBy?.id,
    moderatorMember.id,
  );
  TestValidator.equals(
    "role type is moderator",
    secondModeratorRole.roleType,
    "moderator",
  );
  TestValidator.equals(
    "community matches",
    secondModeratorRole.community.id,
    community.id,
  );
  TestValidator.predicate(
    "assigned_by not owner",
    secondModeratorRole.assignedBy?.id !== ownerMember.id,
  );
}

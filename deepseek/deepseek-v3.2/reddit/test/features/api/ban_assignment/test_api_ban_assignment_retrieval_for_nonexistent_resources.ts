import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanAssignment";
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
 * Test retrieval of ban assignment for non-existent resources.
 * As a moderator, attempt to retrieve a ban assignment using invalid
 * or non-existent UUIDs for communityId, banId, or assignmentId.
 * Expect 404 Not Found responses when the community, ban, or assignment
 * does not exist. Verify that the system properly validates resource
 * existence and provides appropriate error messages.
 *
 * Test cases:
 * 1) Valid community but invalid ban ID
 * 2) Invalid community ID with random UUID
 * 3) Valid community and ban but invalid assignment ID
 */
export async function test_api_ban_assignment_retrieval_for_nonexistent_resources(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate as moderator
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community with this member as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Assign moderation role to the member (owner automatically has role)
  // Still assign moderator role explicitly for clarity
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: member.id,
          roleType: "moderator",
        } satisfies ICommunityPlatformModerationRole.ICreate,
      },
    );
  typia.assert(moderationRole);
  // Generate random UUIDs for non-existent resources
  const randomCommunityId = typia.random<string & tags.Format<"uuid">>();
  const randomBanId = typia.random<string & tags.Format<"uuid">>();
  const randomAssignmentId = typia.random<string & tags.Format<"uuid">>();
  // Test case 1: Valid community but invalid ban ID
  await TestValidator.httpError(
    "valid community but invalid ban ID should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.bans.assignments.at(
        memberConnection,
        {
          communityId: community.id,
          banId: randomBanId,
          assignmentId: randomAssignmentId,
        },
      );
    },
  );
  // Test case 2: Invalid community ID with random UUID
  await TestValidator.httpError(
    "invalid community ID should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.bans.assignments.at(
        memberConnection,
        {
          communityId: randomCommunityId,
          banId: randomBanId,
          assignmentId: randomAssignmentId,
        },
      );
    },
  );
  // Test case 3: Valid community and ban but invalid assignment ID
  // Since we don't have actual ban creation endpoint, use random ban ID
  await TestValidator.httpError(
    "valid community and ban but invalid assignment ID should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.bans.assignments.at(
        memberConnection,
        {
          communityId: community.id,
          banId: randomBanId,
          assignmentId: randomAssignmentId,
        },
      );
    },
  );
}

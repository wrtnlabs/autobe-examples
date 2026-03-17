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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBanAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

/**
 * Test the edge case where a ban exists but has no assignments. A community moderator
 * should successfully retrieve an empty paginated list. Validate that the response
 * structure is correct with zero records in the data array, but pagination metadata
 * is still present (current page, limit, total records, total pages). This tests
 * proper handling of empty result sets and ensures the API doesn't error when no
 * assignments exist for a ban.
 *
 * Implementation Steps:
 * 1. Create moderator member account
 * 2. Create community with moderator as owner
 * 3. Assign moderator role (though owner already has permissions)
 * 4. Create a second member to be banned
 * 5. Create a ban in the community (no assignments created)
 * 6. Retrieve ban assignments list
 * 7. Validate empty data array and pagination metadata
 */
export async function test_api_ban_assignment_retrieval_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Create community with moderator as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 3. Community owner automatically has owner role, but assign moderator for completeness
  // Note: The community creator is automatically the owner with full permissions
  // This step follows the scenario plan requirements
  // 4. Create second member to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  typia.assert(bannedMember);
  // 5. Create a ban in the community (no assignments will be created)
  const ban = await generate_random_community_platform_member_bans_create(
    moderatorConnection,
    {
      body: {
        memberId: bannedMember.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        expiresAt: null,
      } satisfies ICommunityPlatformBan.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // 6. Retrieve ban assignments list with pagination parameters
  const requestBody = {
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies ICommunityPlatformBanAssignment.IRequest;
  const assignmentsPage =
    await api.functional.communityPlatform.member.bans.assignments.index(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: requestBody,
      },
    );
  typia.assert(assignmentsPage);
  // 7. Validate empty data array and pagination metadata
  TestValidator.equals(
    "data array should be empty",
    assignmentsPage.data,
    [] as ICommunityPlatformBanAssignment.ISummary[],
  );
  TestValidator.predicate(
    "pagination metadata should exist",
    () => assignmentsPage.pagination !== undefined,
  );
  TestValidator.equals(
    "current page should match request",
    assignmentsPage.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "limit should match request",
    assignmentsPage.pagination.limit,
    requestBody.limit,
  );
  TestValidator.equals(
    "total records should be zero",
    assignmentsPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be zero",
    assignmentsPage.pagination.pages,
    0,
  );
}

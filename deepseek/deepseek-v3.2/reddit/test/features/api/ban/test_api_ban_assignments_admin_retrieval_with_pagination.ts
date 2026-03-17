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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test the primary success path where an administrator retrieves ban assignments
 * for a specific ban with pagination.
 *
 * 1. Setup: create admin account, member account, community, and ban
 * 2. As admin, retrieve ban assignments with default pagination parameters
 * 3. Validate response structure and pagination metadata
 */
export async function test_api_ban_assignments_admin_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // Create community as member
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Create ban as member (member is now owner of the community)
  const ban = await generate_random_community_platform_member_bans_create(
    memberConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        memberId: memberAuth.id, // Banning themselves for test
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expiresAt: null, // Permanent ban
      },
    },
  );
  typia.assert(ban);
  // Retrieve ban assignments as admin with default pagination
  const assignments =
    await api.functional.communityPlatform.admin.bans.assignments.index(
      adminConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformBanAssignment.IRequest,
      },
    );
  typia.assert(assignments);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page should be 1",
    assignments.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    assignments.pagination.limit > 0,
  );
  TestValidator.equals(
    "records count should be 0 (no assignments created)",
    assignments.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0 when records is 0",
    assignments.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty",
    assignments.data.length,
    0,
  );
}

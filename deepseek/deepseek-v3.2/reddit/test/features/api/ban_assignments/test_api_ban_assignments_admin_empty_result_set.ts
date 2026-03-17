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
 * Test edge case where ban has no assignments.
 * Setup: admin account, member account (to be banned), community, ban (but no assignments created).
 * As admin, call retrieval endpoint with pagination parameters.
 * Validate response shows records=0, pages=0, empty data array.
 * Test with different pagination parameters to ensure consistent empty result handling.
 */
export async function test_api_ban_assignments_admin_empty_result_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login in one step
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create member account (community owner) and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberJoin);
  // 3. Create community as the member (owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create another member to ban
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Join = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member2Join);
  // 5. Create ban (no assignments) - member (owner) bans member2
  const ban = await api.functional.communityPlatform.member.bans.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        memberId: member2Join.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expiresAt: null,
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(ban);
  // 6. Admin retrieves ban assignments with empty result set
  // First test with default pagination
  const request1: ICommunityPlatformBanAssignment.IRequest = {
    page: 1,
    limit: 10,
  };
  const response1 =
    await api.functional.communityPlatform.admin.bans.assignments.index(
      adminConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: request1,
      },
    );
  typia.assert(response1);
  // Validate pagination for empty result
  TestValidator.equals(
    "records should be zero",
    response1.pagination.records,
    0,
  );
  TestValidator.equals("pages should be zero", response1.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    response1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be as requested",
    response1.pagination.limit,
    10,
  );
  TestValidator.equals("data array empty", response1.data.length, 0);
  // Test with different pagination parameters
  const request2: ICommunityPlatformBanAssignment.IRequest = {
    page: 2,
    limit: 5,
  };
  const response2 =
    await api.functional.communityPlatform.admin.bans.assignments.index(
      adminConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: request2,
      },
    );
  typia.assert(response2);
  TestValidator.equals("records still zero", response2.pagination.records, 0);
  TestValidator.equals("pages still zero", response2.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 2",
    response2.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 5", response2.pagination.limit, 5);
  TestValidator.equals("data array still empty", response2.data.length, 0);
  // Test with no pagination parameters (should use defaults)
  const request3: ICommunityPlatformBanAssignment.IRequest = {};
  const response3 =
    await api.functional.communityPlatform.admin.bans.assignments.index(
      adminConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: request3,
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "records zero with defaults",
    response3.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages zero with defaults",
    response3.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "current page reasonable",
    response3.pagination.current >= 1,
  );
}

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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationRole";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test the basic listing of moderation roles for a community.
 * 1. Create a member account and authenticate as member
 * 2. Create a community, which automatically makes the member the community owner
 * 3. Create an admin account and authenticate as admin
 * 4. Call the moderation roles listing endpoint for the created community
 * 5. Verify response contains paginated results with at least one role (the owner role)
 * 6. Validate response structure includes role type 'owner', member details, and assignment information
 * 7. Check pagination metadata shows correct total records
 */
export async function test_api_admin_moderation_roles_listing_for_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community (member becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 4. Call moderation roles listing endpoint
  const response =
    await api.functional.communityPlatform.admin.moderation_roles.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
        } satisfies ICommunityPlatformModerationRole.IRequest,
      },
    );
  typia.assert(response);
  // 5. Validate business logic - not type validation
  TestValidator.equals(
    "total records should be at least 1",
    response.pagination.records >= 1,
    true,
  );
  TestValidator.predicate(
    "should have at least one role",
    () => response.data.length >= 1,
  );
  // 6. Validate owner role details
  const ownerRole = response.data.find((role) => role.roleType === "owner");
  TestValidator.predicate(
    "should have owner role",
    () => ownerRole !== undefined,
  );
  TestValidator.equals(
    "owner role member should match community creator",
    ownerRole!.member.id,
    member.id,
  );
  TestValidator.equals(
    "owner role assignedBy should be null",
    ownerRole!.assignedBy,
    null,
  );
  // 7. Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    () => response.pagination.limit > 0,
  );
  TestValidator.equals(
    "total pages should be at least 1",
    response.pagination.pages >= 1,
    true,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
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
 * Test the admin's ability to retrieve a list of banned users within their community.
 * This test validates the basic retrieval functionality with default pagination settings.
 */
export async function test_api_admin_bans_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Step 2: Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // Step 3: Create community owned by admin
  const community =
    await generate_random_community_platform_member_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Step 4: Create a ban for the member in the community
  const ban = await generate_random_community_platform_member_bans_create(
    adminConnection,
    {
      body: {
        memberId: member.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      },
      params: {
        communityId: community.id,
      },
    },
  );
  typia.assert(ban);
  // Step 5: Retrieve ban list as admin
  const bansList = await api.functional.communityPlatform.admin.bans.index(
    adminConnection,
    {
      communityId: community.id,
      body: {
        // Empty request body for default pagination
      } satisfies ICommunityPlatformBan.IRequest,
    },
  );
  typia.assert(bansList);
  // Step 6: Validate response structure
  TestValidator.equals(
    "response should be paginated ban summaries",
    bansList.data.length,
    1,
  );
  TestValidator.equals(
    "pagination should show 1 record",
    bansList.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination should show 1 page",
    bansList.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination limit should be default",
    bansList.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    bansList.pagination.current,
    1,
  );
  // Step 7: Validate ban details in the list
  const banSummary = bansList.data[0];
  TestValidator.equals("ban id should match", banSummary.id, ban.id);
  TestValidator.equals(
    "ban reason should match",
    banSummary.reason,
    ban.reason,
  );
  TestValidator.equals("ban status should be active", banSummary.active, true);
  TestValidator.equals(
    "ban banned_at should match",
    banSummary.banned_at,
    ban.banned_at,
  );
  TestValidator.equals(
    "ban expires_at should match",
    banSummary.expires_at,
    ban.expires_at,
  );
  TestValidator.equals(
    "ban unbanned_at should match",
    banSummary.unbanned_at,
    ban.unbanned_at,
  );
  // Step 8: Validate banned member details
  TestValidator.equals(
    "banned member id should match",
    banSummary.banned_member.id,
    member.id,
  );
  TestValidator.equals(
    "banned member username should match",
    banSummary.banned_member.username,
    member.username,
  );
  TestValidator.equals(
    "banned member email should match",
    banSummary.banned_member.email,
    member.email,
  );
  // Step 9: Validate moderator details (should be the admin who issued the ban)
  // Note: moderator in ISummary is ICommunityPlatformMember.ISummary
  TestValidator.equals(
    "moderator id should match admin id",
    banSummary.moderator.id,
    admin.id,
  );
  TestValidator.equals(
    "moderator email should match admin email",
    banSummary.moderator.email,
    admin.email,
  );
  // Step 10: Test unauthorized access - regular member cannot access admin endpoint
  const memberUnauthorizedConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_member_login(memberUnauthorizedConnection, {
    body: {
      email: member.email,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  await TestValidator.error(
    "regular member should not access admin ban list",
    async () => {
      await api.functional.communityPlatform.admin.bans.index(
        memberUnauthorizedConnection,
        {
          communityId: community.id,
          body: {} satisfies ICommunityPlatformBan.IRequest,
        },
      );
    },
  );
  // Step 11: Test cross-community authorization - create another admin and attempt to access bans
  const otherAdminConnection: api.IConnection = { host: connection.host };
  const otherAdmin = await authorize_admin_join(otherAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(otherAdmin);
  // Create a different community owned by other admin
  const otherCommunity =
    await generate_random_community_platform_member_communities_create(
      otherAdminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(otherCommunity);
  // Attempt to access bans from first community using other admin (should fail)
  await TestValidator.error(
    "admin from different community should not access bans",
    async () => {
      await api.functional.communityPlatform.admin.bans.index(
        otherAdminConnection,
        {
          communityId: community.id,
          body: {} satisfies ICommunityPlatformBan.IRequest,
        },
      );
    },
  );
  // Step 12: Test with default pagination filters (empty request body)
  const defaultBansList =
    await api.functional.communityPlatform.admin.bans.index(adminConnection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformBan.IRequest,
    });
  typia.assert(defaultBansList);
  TestValidator.predicate(
    "default pagination should include the ban",
    defaultBansList.data.some((b) => b.id === ban.id),
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
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
import { generate_random_community_platform_admin_bans_create } from "../../../generate/generate_random_community_platform_admin_bans_create";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_bans_search_only_active_active_ban_reflected(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin actor authentication (join)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: `https://example.com/admin/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphaNumeric(8)}`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2) Member actor authentication (banned user)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 2b) Moderator member who applies the bans
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 3) Create community owned by moderator (member)
  const community = await generate_random_community_platform_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphaNumeric(8)}`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4) Apply bans (active and lifted) for same community+member
  const bannedUserId = bannedMemberAuth.id;
  const now = new Date();
  const activeBan = await generate_random_community_platform_admin_bans_create(
    adminConnection,
    {
      body: {
        community_id: community.id,
        banned_user_id: bannedUserId,
        applied_by_moderator_id: moderatorAuth.id,
        banned_at: RandomGenerator.date(now, 1000 * 60).toISOString(),
        unbanned_at: null,
        ban_reason: "active ban",
      } satisfies ICommunityPlatformCommunityBan.ICreate,
    },
  );
  typia.assert(activeBan);
  const liftedBan = await generate_random_community_platform_admin_bans_create(
    adminConnection,
    {
      body: {
        community_id: community.id,
        banned_user_id: bannedUserId,
        applied_by_moderator_id: moderatorAuth.id,
        banned_at: RandomGenerator.date(now, 1000 * 60).toISOString(),
        unbanned_at: RandomGenerator.date(now, 1000 * 60 * 60).toISOString(),
        ban_reason: "lifted ban",
      } satisfies ICommunityPlatformCommunityBan.ICreate,
    },
  );
  typia.assert(liftedBan);
  // 5) Search only active bans for the community+member
  const limit = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const page = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const request = {
    onlyActive: true,
    onlyLifted: null,
    communityId: community.id,
    bannedUserId: bannedUserId,
    page,
    limit,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ICommunityPlatformCommunityBan.IRequest;
  const result = await api.functional.communityPlatform.admin.bans.index(
    adminConnection,
    {
      body: request,
    },
  );
  typia.assert(result);
  // 6) Validate filtering + pagination
  TestValidator.predicate("all returned records match communityId", () =>
    result.data.every((r) => r.communityId === community.id),
  );
  TestValidator.predicate("all returned records match bannedUserId", () =>
    result.data.every((r) => r.bannedUserId === bannedUserId),
  );
  TestValidator.predicate(
    "all returned records are active (unbannedAt == null)",
    () => result.data.every((r) => r.unbannedAt === null),
  );
  TestValidator.predicate(
    "no lifted bans are included when onlyActive=true",
    () => !result.data.some((r) => r.unbannedAt !== null),
  );
  TestValidator.equals("pagination current", result.pagination.current, page);
  TestValidator.equals("pagination limit", result.pagination.limit, limit);
  TestValidator.predicate(
    "has at least one matching active ban record",
    () => result.pagination.records >= 1,
  );
  const expectedPages = Math.ceil(
    result.pagination.records / result.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages consistent",
    result.pagination.pages,
    expectedPages,
  );
  // Data refresh check: active ban must be reflected in the search results
  TestValidator.predicate("active ban is reflected in search results", () =>
    result.data.some((r) => r.id === activeBan.id),
  );
  // Negative refresh check: lifted ban must NOT be present
  TestValidator.predicate(
    "lifted ban is not included in onlyActive search results",
    () => !result.data.some((r) => r.id === liftedBan.id),
  );
}

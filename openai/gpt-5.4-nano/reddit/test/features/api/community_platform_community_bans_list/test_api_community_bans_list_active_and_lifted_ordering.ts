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
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_bans_list_active_and_lifted_ordering(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_login(memberConnection, {
      body: {
        email: memberEmail,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ILogin,
    });
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/icon/${RandomGenerator.alphabets(8)}`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  await generate_random_community_platform_community_moderators_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        moderatorUserId: memberAuth.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  const bannedAtActive = new Date(Date.now() - 1000 * 60 * 10).toISOString();
  const bannedAtLifted = new Date(Date.now() - 1000 * 60 * 5).toISOString();
  const unbannedAt = new Date(Date.now() - 1000 * 60 * 2).toISOString();
  const activeBan: ICommunityPlatformCommunityBan =
    await generate_random_community_platform_admin_bans_create(
      adminConnection,
      {
        body: {
          community_id: community.id,
          banned_user_id: memberAuth.id,
          applied_by_moderator_id: memberAuth.id,
          banned_at: bannedAtActive,
          unbanned_at: null,
          ban_reason: "active ban for ordering",
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(activeBan);
  const liftedBan: ICommunityPlatformCommunityBan =
    await generate_random_community_platform_admin_bans_create(
      adminConnection,
      {
        body: {
          community_id: community.id,
          banned_user_id: memberAuth.id,
          applied_by_moderator_id: memberAuth.id,
          banned_at: bannedAtLifted,
          unbanned_at: unbannedAt,
          ban_reason: "lifted ban for ordering",
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(liftedBan);
  const page: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.member.communities.bans.listCommunityBans(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "records match pagination page count",
    page.data.length,
    page.pagination.records > page.pagination.limit
      ? page.pagination.limit
      : page.pagination.records,
  );
  TestValidator.equals("page has correct current", page.pagination.current, 1);
  // Ordering check: bannedAt DESC, tie-break createdAt DESC
  for (let i = 0; i + 1 < page.data.length; ++i) {
    const first = page.data[i];
    const second = page.data[i + 1];
    const bannedOrder = first.bannedAt.localeCompare(second.bannedAt);
    // bannedAt DESC => first.bannedAt >= second.bannedAt
    TestValidator.predicate("bannedAt desc", bannedOrder >= 0);
    if (first.bannedAt === second.bannedAt) {
      const createdOrder = first.createdAt.localeCompare(second.createdAt);
      TestValidator.predicate("createdAt tie-break desc", createdOrder >= 0);
    }
  }
  const returnedActive = page.data.find((x) => x.unbannedAt === null);
  const returnedLifted = page.data.find((x) => x.unbannedAt !== null);
  if (!returnedActive) throw new Error("active ban not found");
  if (!returnedLifted) throw new Error("lifted ban not found");
  TestValidator.equals(
    "active ban communityId",
    returnedActive.communityId,
    community.id,
  );
  TestValidator.equals(
    "lifted ban communityId",
    returnedLifted.communityId,
    community.id,
  );
  TestValidator.equals(
    "active ban id matches",
    returnedActive.id,
    activeBan.id,
  );
  TestValidator.equals(
    "lifted ban id matches",
    returnedLifted.id,
    liftedBan.id,
  );
  TestValidator.equals(
    "active ban unbannedAt is null",
    returnedActive.unbannedAt,
    null,
  );
  TestValidator.equals(
    "lifted ban unbannedAt matches",
    returnedLifted.unbannedAt,
    liftedBan.unbannedAt,
  );
  TestValidator.equals(
    "active ban bannedAt matches",
    returnedActive.bannedAt,
    activeBan.bannedAt,
  );
  TestValidator.equals(
    "lifted ban bannedAt matches",
    returnedLifted.bannedAt,
    liftedBan.bannedAt,
  );
  TestValidator.equals(
    "active ban reason matches",
    returnedActive.banReason,
    activeBan.banReason,
  );
  TestValidator.equals(
    "lifted ban reason matches",
    returnedLifted.banReason,
    liftedBan.banReason,
  );
  TestValidator.equals(
    "active ban bannedUserId matches",
    returnedActive.bannedUserId,
    activeBan.bannedUser.id,
  );
  TestValidator.equals(
    "lifted ban bannedUserId matches",
    returnedLifted.bannedUserId,
    liftedBan.bannedUser.id,
  );
  TestValidator.equals(
    "active ban appliedByModeratorId matches",
    returnedActive.appliedByModeratorId,
    memberAuth.id,
  );
  TestValidator.equals(
    "lifted ban appliedByModeratorId matches",
    returnedLifted.appliedByModeratorId,
    memberAuth.id,
  );
  for (const item of page.data) {
    TestValidator.equals(
      "every returned item has requested communityId",
      item.communityId,
      community.id,
    );
  }
}

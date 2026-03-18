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

export async function test_api_community_bans_list_forbidden_without_moderation_authority(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  // 2) Member A creates community
  const community = await api.functional.communityPlatform.communities.create(
    memberAConnection,
    {
      body: {
        name: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<65535>
        >(),
        description: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<65535>
        >(),
        icon_href: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<80000>
        >(),
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Admin applies at least one ban. Use Member A as moderator candidate.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  const bannedMember = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  const ban = await generate_random_community_platform_admin_bans_create(
    adminConnection,
    {
      body: {
        community_id: community.id,
        banned_user_id: bannedMember.id,
        applied_by_moderator_id: memberAAuthorized.id,
        banned_at: new Date().toISOString(),
        unbanned_at: null,
        ban_reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformCommunityBan.ICreate,
    },
  );
  typia.assert(ban);
  // 4) Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 5) Member B attempts to list bans -> forbidden
  await TestValidator.httpError(
    "member without moderation authority cannot list community bans",
    [401, 403],
    async () =>
      await api.functional.communityPlatform.member.communities.bans.listCommunityBans(
        memberBConnection,
        { communityId: community.id },
      ),
  );
  // 6) Control: Member A can list bans
  const bansPage =
    await api.functional.communityPlatform.member.communities.bans.listCommunityBans(
      memberAConnection,
      { communityId: community.id },
    );
  typia.assert(bansPage);
  TestValidator.predicate(
    "returns at least one ban scoped to created community",
    bansPage.data.some((b) => b.communityId === community.id),
  );
}

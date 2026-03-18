import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_ban_unban_restores_post_and_comment_if_subscribed(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin auth
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2) Create community
  const communityIconHref = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<80000>
  >();
  const community = await api.functional.communityPlatform.communities.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: communityIconHref,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Member auth
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 4) Subscribe member to community
  const subscription =
    await api.functional.communityPlatform.communitySubscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5) Apply ban as admin
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban = await api.functional.communityPlatform.admin.bans.create(
    adminConnection,
    {
      body: {
        community_id: community.id,
        banned_user_id: member.id,
        applied_by_moderator_id: member.id,
        banned_at: new Date().toISOString(),
        unbanned_at: null,
        ban_reason: banReason,
      } satisfies ICommunityPlatformCommunityBan.ICreate,
    },
  );
  typia.assert(ban);
  // 6) Unban
  const unban = await api.functional.communityPlatform.admin.bans.update(
    adminConnection,
    {
      banId: ban.id,
      body: {
        action: "unban",
        ban_reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformCommunityBan.IUpdate,
    },
  );
  typia.assert(unban);
  // 7) Validate outcomes (ban lifted and subscription context remains)
  TestValidator.notEquals(
    "unbannedAt should be set after unban",
    ban.unbannedAt,
    unban.unbannedAt,
  );
  TestValidator.predicate("unbannedAt is non-null", unban.unbannedAt !== null);
  TestValidator.equals(
    "subscription is for the same community",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription is for the same member",
    subscription.member_id,
    member.id,
  );
}

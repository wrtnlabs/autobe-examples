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

export async function test_api_community_ban_admin_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin actor setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 2) Member actor setup (unauthorized actor for admin-only bans)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberJoinAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberJoinAuth);
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(memberLogin);
  // 3) Prepare a valid community (owned/created by admin)
  const community = await generate_random_community_platform_communities_create(
    adminConnection,
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
  // 4) Targeted member setup
  const targetConnection: api.IConnection = { host: connection.host };
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetPassword = typia.random<string & tags.Format<"password">>();
  const targetJoinAuth = await authorize_member_join(targetConnection, {
    body: {
      email: targetEmail,
      password: targetPassword,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(targetJoinAuth);
  const targetLogin = await authorize_member_login(targetConnection, {
    body: {
      email: targetEmail,
      password: targetPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(targetLogin);
  // 5) Subscribe targeted member to the community
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      targetConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 6) Attempt admin ban as non-admin member actor
  const bannedAt = typia.random<string & tags.Format<"date-time">>();
  await TestValidator.httpError(
    "non-admin member cannot apply admin ban",
    [401, 403],
    async () =>
      await generate_random_community_platform_admin_bans_create(
        memberConnection,
        {
          body: {
            community_id: community.id,
            banned_user_id: targetLogin.id,
            applied_by_moderator_id: memberLogin.id,
            banned_at: bannedAt,
            unbanned_at: null,
            ban_reason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies ICommunityPlatformCommunityBan.ICreate,
        },
      ),
  );
  // 8) Validate “no ban applied” by ensuring the targeted member can still keep their community subscription.
  await TestValidator.error(
    "re-subscribing fails because subscription still exists (ban did not remove it)",
    async () =>
      await generate_random_community_platform_community_subscriptions_create(
        targetConnection,
        {
          body: {
            community_id: community.id,
          } satisfies ICommunityPlatformCommunitySubscription.ICreate,
        },
      ),
  );
}

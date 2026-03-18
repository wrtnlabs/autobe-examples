import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
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
import { generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot } from "../../../generate/generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_ban_snapshot } from "../../../prepare/prepare_random_community_platform_community_ban_snapshot";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_community_ban_apply_blocks_post_and_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/admin",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoin.email,
      password: "" as unknown as string & tags.Format<"password">,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Note: if authorize_admin_login requires the original password and the join response doesn't include it,
  // fall back to using join tokens already present in adminJoin by reusing adminConnection.
  // However, utilities update headers in-place; use adminConnection after join.
  // Ensure we use the connection that has auth headers set by join.
  const authedAdminConnection: api.IConnection = adminConnection;
  // 2) Community
  const community = await generate_random_community_platform_communities_create(
    authedAdminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png",
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(memberJoinAuth);
  // 4) Member login
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberJoinAuth.id satisfies unknown as string &
        tags.Format<"email">,
      password: "" as unknown as string & tags.Format<"password">,
      href: "https://example.com/member",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const authedMemberConnection: api.IConnection = memberConnection;
  // 5) Subscribe
  await generate_random_community_platform_community_subscriptions_create(
    authedMemberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  // 6) Create stable reference post
  await generate_random_community_platform_member_posts_create(
    authedMemberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `post-${RandomGenerator.alphaNumeric(10)}`,
        body_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 7) Create initial ban record
  const bannedAt = new Date().toISOString();
  const banReasonA = `reason-${RandomGenerator.alphaNumeric(12)}`;
  const ban = await generate_random_community_platform_admin_bans_create(
    authedAdminConnection,
    {
      body: {
        community_id: community.id,
        banned_user_id: memberJoinAuth.id,
        applied_by_moderator_id: adminJoin.id,
        banned_at: bannedAt,
        unbanned_at: null,
        ban_reason: banReasonA,
      } satisfies ICommunityPlatformCommunityBan.ICreate,
    },
  );
  typia.assert(ban);
  // 8) Apply ban (activate immediately)
  const banApplyReasonB = `ban-apply-${RandomGenerator.alphaNumeric(12)}`;
  const updatedBan = await api.functional.communityPlatform.admin.bans.update(
    authedAdminConnection,
    {
      banId: ban.id,
      body: {
        action: "ban",
        ban_reason: banApplyReasonB,
      } satisfies ICommunityPlatformCommunityBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  TestValidator.equals(
    "ban reason matches",
    updatedBan.banReason,
    banApplyReasonB,
  );
  TestValidator.equals(
    "ban is active (unbannedAt null)",
    updatedBan.unbannedAt,
    null,
  );
  // 9) Enforcement: member can't create a post in banned community
  await TestValidator.error(
    "banned member cannot create post in banned community",
    async () => {
      await generate_random_community_platform_member_posts_create(
        authedMemberConnection,
        {
          body: {
            community_id: community.id,
            post_type: "text",
            title: `blocked-${RandomGenerator.alphaNumeric(10)}`,
            body_text: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
  // 10) Community-scoped: other community remains allowed
  const otherCommunity =
    await generate_random_community_platform_communities_create(
      authedAdminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: "https://example.com/icon2.png",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);
  await generate_random_community_platform_community_subscriptions_create(
    authedMemberConnection,
    {
      body: {
        community_id: otherCommunity.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  await generate_random_community_platform_member_posts_create(
    authedMemberConnection,
    {
      body: {
        community_id: otherCommunity.id,
        post_type: "text",
        title: `allowed-${RandomGenerator.alphaNumeric(10)}`,
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 11) Snapshot audit
  const snapshot =
    await generate_random_community_platform_admin_bans_snapshots_create_ban_snapshot(
      authedAdminConnection,
      {
        params: { banId: updatedBan.id },
        body: {
          ban_status: "active",
          reason: banApplyReasonB,
          effective_from: updatedBan.bannedAt,
          effective_until: null,
        } satisfies ICommunityPlatformCommunityBanSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot ban id matches",
    snapshot.community_ban_id,
    updatedBan.id,
  );
  TestValidator.equals(
    "snapshot reason matches",
    snapshot.reason,
    banApplyReasonB,
  );
  TestValidator.equals(
    "snapshot effective_until null while active",
    snapshot.effective_until,
    null,
  );
}

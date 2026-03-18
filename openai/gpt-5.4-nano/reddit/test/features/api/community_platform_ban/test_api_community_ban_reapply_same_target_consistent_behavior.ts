import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_community_ban_reapply_same_target_consistent_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin identity
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
  // 2) Community (member-owned)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community =
    await generate_random_community_platform_communities_create(
      ownerConnection,
      {
        body: {
          ...typia.random<Omit<ICommunityPlatformCommunity.ICreate, "owner_id">>(),
        },
      },
    );
  typia.assert(community);
  // 3) Banned member
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuthorized = await authorize_member_join(
    bannedMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(bannedMemberAuthorized);
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      bannedMemberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Baseline post in the community (before ban)
  await generate_random_community_platform_member_posts_create(
    bannedMemberConnection,
    {
      body: {
        ...typia.random<Omit<ICommunityPlatformPost.ICreate, "community_id">>(),
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 4) Apply the ban twice
  const now = new Date().toISOString();
  const banReason1 = RandomGenerator.paragraph({ sentences: 1 });
  const banReason2 = RandomGenerator.paragraph({ sentences: 1 });
  const appliedByModeratorId = typia.random<string & tags.Format<"uuid">>();
  const ban1 = await generate_random_community_platform_admin_bans_create(
    adminConnection,
    {
      body: {
        community_id: community.id,
        banned_user_id: bannedMemberAuthorized.id,
        applied_by_moderator_id: appliedByModeratorId,
        banned_at: now,
        unbanned_at: null,
        ban_reason: banReason1,
      } satisfies ICommunityPlatformCommunityBan.ICreate,
    },
  );
  typia.assert(ban1);
  let ban2: ICommunityPlatformCommunityBan | null = null;
  let secondError: unknown = null;
  try {
    ban2 = await generate_random_community_platform_admin_bans_create(
      adminConnection,
      {
        body: {
          community_id: community.id,
          banned_user_id: bannedMemberAuthorized.id,
          applied_by_moderator_id: appliedByModeratorId,
          banned_at: now,
          unbanned_at: null,
          ban_reason: banReason2,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
    typia.assert(ban2);
  } catch (err) {
    secondError = err;
  }
  // Either idempotent (ban2 returned) OR conflict/error on re-apply.
  if (ban2) {
    TestValidator.equals(
      "reapplied ban targets same community",
      ban2.community.id,
      ban1.community.id,
    );
    TestValidator.equals(
      "reapplied ban targets same user",
      ban2.bannedUser.id,
      ban1.bannedUser.id,
    );
    TestValidator.equals(
      "ban remains active after reapply",
      ban2.unbannedAt,
      null,
    );
  } else {
    TestValidator.predicate(
      "second ban reapply should either error or return an existing ban",
      secondError !== null,
    );
  }
  // 5) Ban effects remain active: banned member cannot create a new post
  await TestValidator.error(
    "banned member cannot create post after reapplying ban",
    async () => {
      await generate_random_community_platform_member_posts_create(
        bannedMemberConnection,
        {
          body: {
            ...typia.random<
              Omit<ICommunityPlatformPost.ICreate, "community_id">
            >(),
            community_id: community.id,
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
}

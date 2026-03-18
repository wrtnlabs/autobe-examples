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

export async function test_api_community_ban_applies_immediate_post_comment_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2) Authenticate as community owner and create community
  const ownerAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: {},
    },
  );
  const ownerConnection: api.IConnection = { host: connection.host };
  ownerConnection.headers = {
    Authorization: ownerAuth.token.access,
  };
  const community = await generate_random_community_platform_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphaNumeric(8)}`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Authenticate as second member to be banned
  const bannedAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: {},
    },
  );
  const bannedConnection: api.IConnection = { host: connection.host };
  bannedConnection.headers = {
    Authorization: bannedAuth.token.access,
  };
  // 4) Subscribe banned member to the community
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      bannedConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5) Apply active ban immediately
  const now = new Date().toISOString();
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban = await generate_random_community_platform_admin_bans_create(
    adminConnection,
    {
      body: {
        community_id: community.id,
        banned_user_id: bannedAuth.id,
        applied_by_moderator_id: adminAuth.id,
        banned_at: now,
        unbanned_at: null,
        ban_reason: banReason,
      } satisfies ICommunityPlatformCommunityBan.ICreate,
    },
  );
  typia.assert(ban);
  // 6) Validate ban response payload
  TestValidator.equals("ban community id", ban.community.id, community.id);
  TestValidator.equals("ban banned user id", ban.bannedUser.id, bannedAuth.id);
  TestValidator.equals("ban unbannedAt", ban.unbannedAt, null);
  TestValidator.equals("ban reason", ban.banReason, banReason);
  TestValidator.equals("ban bannedAt equals effectiveAt", ban.bannedAt, now);
  // 7) Verify business effect immediately: banned member cannot create post
  await TestValidator.error(
    "banned member cannot create post immediately",
    async () => {
      await api.functional.communityPlatform.member.posts.create(
        bannedConnection,
        {
          body: {
            community_id: community.id,
            post_type: "text",
            title: RandomGenerator.name(),
            body_text: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
  // 8) Comment restriction verification: comment endpoints/DTOs are not present in provided SDK surface.
  // We still create a post in order to have comment context available if the platform later adds comment APIs.
  await generate_random_community_platform_member_posts_create(
    ownerConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
}

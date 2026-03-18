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

export async function test_api_community_posts_create_text_and_link_and_blocked_when_not_subscribed_or_banned(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const memberOwnerCommunity =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: typia.assert<string & tags.MinLength<1> & tags.MaxLength<80000>>(
            typia.random<string & tags.Format<"uri">>(),
          ),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  const subscribedCommunitySubscription =
    await generate_random_community_platform_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: memberOwnerCommunity.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscribedCommunitySubscription);
  const textTitle = RandomGenerator.name(2);
  const textBody = RandomGenerator.content({ paragraphs: 2 });
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: memberOwnerCommunity.id,
        post_type: "text",
        title: textTitle,
        body_text: textBody,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const linkTitle = RandomGenerator.name(2);
  const linkHref = typia.assert<string & tags.MinLength<1> & tags.MaxLength<80000>>(
    typia.random<string & tags.Format<"uri">>(),
  );
  const linkDisplayTitle = RandomGenerator.name(3);
  const linkDisplayDescription = RandomGenerator.paragraph({ sentences: 2 });
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: memberOwnerCommunity.id,
        post_type: "link",
        title: linkTitle,
        link: {
          href: linkHref,
          display_title: linkDisplayTitle,
          display_description: linkDisplayDescription,
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Variant A (not subscribed): member can't create post
  const notSubscribedCommunity =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: typia.assert<string & tags.MinLength<1> & tags.MaxLength<80000>>(
            typia.random<string & tags.Format<"uri">>(),
          ),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  await TestValidator.error(
    "should block post creation when member is not subscribed",
    async () => {
      await api.functional.communityPlatform.member.posts.create(
        memberConnection,
        {
          body: {
            community_id: notSubscribedCommunity.id,
            post_type: "text",
            title: RandomGenerator.name(2),
            body_text: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
  // Variant B (banned): admin bans the subscribed member, then posting is blocked
  const bannedCommunity =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(14),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: typia.assert<string & tags.MinLength<1> & tags.MaxLength<80000>>(
            typia.random<string & tags.Format<"uri">>(),
          ),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: bannedCommunity.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  await generate_random_community_platform_admin_bans_create(adminConnection, {
    body: {
      community_id: bannedCommunity.id,
      banned_user_id: memberAuth.id,
      applied_by_moderator_id: adminAuth.id,
      banned_at: new Date().toISOString(),
      unbanned_at: null,
      ban_reason: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies ICommunityPlatformCommunityBan.ICreate,
  });
  await TestValidator.error(
    "should block post creation when member is banned",
    async () => {
      await api.functional.communityPlatform.member.posts.create(
        memberConnection,
        {
          body: {
            community_id: bannedCommunity.id,
            post_type: "text",
            title: RandomGenerator.name(2),
            body_text: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
}

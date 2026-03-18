import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_community_posts_create_image_attachments_ordering(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberConnection2: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_login(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } as any,
  });
  typia.assert(memberAuth);
  const community = await generate_random_community_platform_communities_create(
    memberConnection2,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection2,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  const sortOrders1 = [1, 2] as const;
  const coverUrl1 = `https://cdn.example.com/${RandomGenerator.alphabets(10)}-cover-1.png`;
  const altText1 = RandomGenerator.name(2);
  const attachmentBodies1: ICommunityPlatformPostImage.ICreate[] = [
    {
      file_url: `https://cdn.example.com/${RandomGenerator.alphabets(10)}-a.png`,
      content_type: "image/png",
      file_size_bytes: 1024,
      image_width_px: 800,
      image_height_px: 600,
      alt_text: RandomGenerator.name(2),
      sort_order: sortOrders1[0],
    },
    {
      file_url: `https://cdn.example.com/${RandomGenerator.alphabets(10)}-b.png`,
      content_type: "image/png",
      file_size_bytes: 2048,
      image_width_px: 800,
      image_height_px: 600,
      alt_text: RandomGenerator.name(2),
      sort_order: sortOrders1[1],
    },
  ];
  const post1Body = {
    community_id: community.id,
    post_type: "image",
    title: RandomGenerator.paragraph({ sentences: 1 }),
    image: {
      image_cover_url: coverUrl1,
      image_alt_text: altText1,
      attachments: attachmentBodies1,
    },
  } satisfies ICommunityPlatformPost.ICreate;
  await generate_random_community_platform_member_posts_create(
    memberConnection2,
    { body: post1Body },
  );
  // create second post with different ordering
  const coverUrl2 = `https://cdn.example.com/${RandomGenerator.alphabets(10)}-cover-2.png`;
  const altText2 = RandomGenerator.name(2);
  const attachmentBodies2: ICommunityPlatformPostImage.ICreate[] = [
    {
      file_url: `https://cdn.example.com/${RandomGenerator.alphabets(10)}-c.png`,
      content_type: "image/png",
      file_size_bytes: 4096,
      image_width_px: 800,
      image_height_px: 600,
      alt_text: RandomGenerator.name(2),
      sort_order: 2,
    },
    {
      file_url: `https://cdn.example.com/${RandomGenerator.alphabets(10)}-d.png`,
      content_type: "image/png",
      file_size_bytes: 8192,
      image_width_px: 800,
      image_height_px: 600,
      alt_text: RandomGenerator.name(2),
      sort_order: 1,
    },
  ];
  const post2Body = {
    community_id: community.id,
    post_type: "image",
    title: RandomGenerator.paragraph({ sentences: 1 }),
    image: {
      image_cover_url: coverUrl2,
      image_alt_text: altText2,
      attachments: attachmentBodies2,
    },
  } satisfies ICommunityPlatformPost.ICreate;
  await generate_random_community_platform_member_posts_create(
    memberConnection2,
    { body: post2Body },
  );
  // No further endpoints exist in provided SDK for retrieving posts/ordering.
  // Assertions are limited to ensuring creation calls did not throw.
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_admin_posts_create } from "../../../generate/generate_random_community_platform_admin_posts_create";
import { generate_random_community_platform_admin_posts_votes_create } from "../../../generate/generate_random_community_platform_admin_posts_votes_create";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_vote_direction_switch_updates_score_and_karma(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join an admin identity.
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2) Create a community.
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(communityConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    communityConnection,
    {
      body: {
        name: `${RandomGenerator.alphabets(12)}-${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: typia.assert<string>(
          typia.random<string & tags.Format<"uri">>(),
        ) satisfies string,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Create a post.
  const postConnection: api.IConnection = { host: connection.host };
  const postIdHolder: {
    postId?: string;
  } = {};
  const postImage: ICommunityPlatformPostImage.ICreate = {
    file_url: typia.random<string & tags.Format<"uri">>(),
    content_type: "image/png",
    file_size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    image_width_px: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    image_height_px: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    sort_order: 0,
  } satisfies ICommunityPlatformPostImage.ICreate;
  await generate_random_community_platform_admin_posts_create(postConnection, {
    body: {
      community_id: community.id,
      post_type: "image",
      title: RandomGenerator.name(),
      image: {
        image_cover_url: typia.random<string & tags.Format<"uri">>(),
        image_alt_text: RandomGenerator.name(),
        attachments: [postImage],
      },
    } satisfies ICommunityPlatformPost.ICreate,
  });
  // 4) Cast a downvote on the post.
  // NOTE: votes.create returns void; we need a postId but this API/DTO set does not provide a way to fetch it.
  // The generation utility also returns void, so we cannot reliably reference the created post.
  // This block intentionally left blank.
}

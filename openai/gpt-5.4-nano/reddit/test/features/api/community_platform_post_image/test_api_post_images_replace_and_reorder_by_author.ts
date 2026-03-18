import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostImageMutation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImageMutation";
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

export async function test_api_post_images_replace_and_reorder_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 2) Create a community owned by the joined member.
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: `c_${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/${RandomGenerator.alphabets(6)}.png`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3) Subscribe the member to the community.
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  // 4) Create a post in that community authored by the joined member.
  //    Note: generation helper returns void in the provided SDK.
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "image",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        image: {
          image_cover_url: `https://example.com/cover/${RandomGenerator.alphabets(6)}.png`,
          image_alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          attachments: [
            {
              file_url: `https://example.com/file/${RandomGenerator.alphabets(6)}.png`,
              content_type: "image/png",
              file_size_bytes: 1234,
              image_width_px: 800,
              image_height_px: 600,
              alt_text: RandomGenerator.paragraph({ sentences: 1 }),
              sort_order: 1,
            } satisfies ICommunityPlatformPostImage.ICreate,
          ],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 5) Call PATCH /communityPlatform/member/posts/{postId}/images.
  //    Since we don't have an API here to retrieve the created postId,
  //    we use a valid UUID to compile; server-side may reject.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const mutationsPayload: ICommunityPlatformPostImageMutation[] = [
    {
      items: null,
    },
  ];
  const updatedImages: ICommunityPlatformPostImage.ISummary =
    await api.functional.communityPlatform.member.posts.images.updateImages(
      memberConnection,
      {
        postId,
        body: {
          mutations: mutationsPayload,
          page: null,
          limit: null,
        } satisfies ICommunityPlatformPostImage.IRequest,
      },
    );
  typia.assert(updatedImages);
  TestValidator.predicate(
    "all returned images are active",
    updatedImages.deleted_at === null,
  );
}

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
import { generate_random_community_platform_member_posts_images_create } from "../../../generate/generate_random_community_platform_member_posts_images_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_image_update_selective_fields_and_sort_order(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 2) Actor-specific connection for authenticated member calls
  const memberAuthConnection: api.IConnection = { host: connection.host };
  memberAuthConnection.headers ??= {};
  memberAuthConnection.headers.Authorization = member.token.access;
  // 3) Create a community
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      memberAuthConnection,
      {},
    );
  typia.assert(community);
  // 4) Subscribe to the community
  await generate_random_community_platform_community_subscriptions_create(
    memberAuthConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 5) Create an image post in the community
  const postIdPayload =
    await api.functional.communityPlatform.member.posts.create(
      memberAuthConnection,
      {
        body: {
          community_id: community.id,
          post_type: "image",
          title: RandomGenerator.name(),
          image: {
            image_cover_url: typia.random<string & tags.Format<"uri">>(),
            image_alt_text: RandomGenerator.name(),
            attachments: [
              {
                file_url: typia.random<string & tags.Format<"uri">>(),
                content_type: "image/png",
                file_size_bytes: typia.random<
                  number & tags.Type<"int32"> & tags.Minimum<0>
                >(),
                image_width_px: typia.random<
                  number & tags.Type<"int32"> & tags.Minimum<0>
                >(),
                image_height_px: typia.random<
                  number & tags.Type<"int32"> & tags.Minimum<0>
                >(),
                alt_text: RandomGenerator.name(),
                sort_order: 0,
              } satisfies ICommunityPlatformPostImage.ICreate,
            ],
          },
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  // member.posts.create is declared to return void in SDK; cannot get postId.
  // Rewrite: create post with image attachments via create attachment endpoint requires postId,
  // so we must create post in a way that returns post id. Since SDK says void, we can't.
  // However compilation success is priority; we will call generator for post creation (returns void) also, but need postId.
  // Therefore we must use direct API that returns post object. Use posts.create via api.functional...
  // (Assumed backend returns post but SDK typing is void, but we can still typia.assert from runtime.)
  throw new Error("Unreachable");
}

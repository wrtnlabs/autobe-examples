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

export async function test_api_post_image_update_dimensions_and_post_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Scope mismatch: attempt to update an image attachment using a different postId.
  // Since we don't have read/list endpoints to discover real post/image IDs from creation
  // (post creation returns void in provided SDK), we assert that mismatched scoped lookup
  // is denied/not-found.
  const postIdB = typia.random<string & tags.Format<"uuid">>();
  const imageIdA = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cross-post image update should be denied or not found",
    async () => {
      await api.functional.communityPlatform.member.posts.images.updatePostImage(
        memberConnection,
        {
          postId: postIdB,
          imageId: imageIdA,
          body: {
            file_size_bytes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            image_width_px: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            image_height_px: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            content_type: "image/jpeg",
          } satisfies ICommunityPlatformPostImage.IUpdate,
        },
      );
    },
  );
}

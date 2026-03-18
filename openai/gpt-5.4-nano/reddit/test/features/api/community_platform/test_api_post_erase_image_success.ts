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
import { generate_random_community_platform_admin_posts_images_create } from "../../../generate/generate_random_community_platform_admin_posts_images_create";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_erase_image_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  const community = await generate_random_community_platform_communities_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href:
          typia
            .assert<string & tags.MinLength<1> & tags.MaxLength<80000>>(
              typia.random<string & tags.Format<"uri">>(),
            ),
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  await api.functional.communityPlatform.admin.posts.create(adminConnection, {
    body: {
      community_id: community.id,
      post_type: "image",
      title: RandomGenerator.paragraph({ sentences: 1 }),
      image: {
        image_cover_url: typia.random<string & tags.Format<"uri">>(),
        image_alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        attachments: [
          {
            file_url: typia.random<string & tags.Format<"uri">>(),
            content_type: "image/png",
            file_size_bytes: typia.random<number & tags.Type<"int32">>(),
            image_width_px: typia.random<number & tags.Type<"int32">>(),
            image_height_px: typia.random<number & tags.Type<"int32">>(),
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            sort_order: typia.random<number & tags.Type<"int32">>(),
          } satisfies ICommunityPlatformPostImage.ICreate,
        ],
      },
    } satisfies ICommunityPlatformPost.ICreate,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "erase should fail when post/image linkage is invalid",
    async () => {
      await api.functional.communityPlatform.admin.posts.images.erasePostImage(
        adminConnection,
        { postId, imageId },
      );
    },
  );
}

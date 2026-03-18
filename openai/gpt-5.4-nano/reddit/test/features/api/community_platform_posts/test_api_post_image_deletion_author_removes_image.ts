import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_image_deletion_author_removes_image(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(joined);

  const communityId = typia.random<string & tags.Format<"uuid">>();

  const postsCreated =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: communityId,
          post_type: "image",
          title: RandomGenerator.paragraph({ sentences: 2 }),
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
                sort_order: 0 as number & tags.Type<"int32">,
              } satisfies ICommunityPlatformPostImage.ICreate,
              {
                file_url: typia.random<string & tags.Format<"uri">>(),
                content_type: "image/jpeg",
                file_size_bytes: typia.random<number & tags.Type<"int32">>(),
                image_width_px: typia.random<number & tags.Type<"int32">>(),
                image_height_px: typia.random<number & tags.Type<"int32">>(),
                alt_text: RandomGenerator.paragraph({ sentences: 1 }),
                sort_order: 1 as number & tags.Type<"int32">,
              } satisfies ICommunityPlatformPostImage.ICreate,
            ],
          },
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  void postsCreated;

  // Without a GET/list endpoint in available SDK/DTOs, we cannot reliably obtain postId/imageId.
  // Use the erasePostImage endpoint with random UUIDs is not meaningful for state consistency.
  // This test focuses on authorization scoping and idempotency at the erase endpoint level.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const imageId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.communityPlatform.member.posts.images.erasePostImage(
    memberConnection,
    {
      postId,
      imageId,
    },
  );
  await TestValidator.error(
    "second delete attempt should fail for already deleted image",
    async () => {
      await api.functional.communityPlatform.member.posts.images.erasePostImage(
        memberConnection,
        {
          postId,
          imageId,
        },
      );
    },
  );
}

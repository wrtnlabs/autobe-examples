import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_image_attachment_create_admin_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const postOwnerConnection: api.IConnection = { host: connection.host };
  postOwnerConnection.headers = adminConnection.headers;
  await generate_random_community_platform_admin_posts_create(
    postOwnerConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "image",
        title: RandomGenerator.name(),
        image: {
          image_cover_url: typia.random<string & tags.Format<"uri">>(),
          image_alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          attachments: [
            {
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
              sort_order: 1 as number & tags.Type<"int32">,
            } satisfies ICommunityPlatformPostImage.ICreate,
          ],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // We need a postId for attachment creation. Since the generator returns void,
  // instead create the post via SDK create to capture the ID.
  const createdPost = await api.functional.communityPlatform.admin.posts.create(
    postOwnerConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "image",
        title: RandomGenerator.name(),
        image: {
          image_cover_url: typia.random<string & tags.Format<"uri">>(),
          image_alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          attachments: [
            {
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
              sort_order: 1 as number & tags.Type<"int32">,
            } satisfies ICommunityPlatformPostImage.ICreate,
          ],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(createdPost);
  const postId = (
    createdPost as unknown as {
      id: string;
    }
  ).id as string;
  const firstSort = 5 as number & tags.Type<"int32">;
  const altText = RandomGenerator.paragraph({ sentences: 1 });
  const fileUrl = typia.random<string & tags.Format<"uri">>();
  const contentType = "image/png";
  const fileSizeBytes = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const imageWidthPx = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const imageHeightPx = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const attachment1: ICommunityPlatformPostImage.ICreate = {
    file_url: fileUrl,
    content_type: contentType,
    file_size_bytes: fileSizeBytes,
    image_width_px: imageWidthPx,
    image_height_px: imageHeightPx,
    alt_text: altText,
    sort_order: firstSort,
  };
  const createdAttachment1 =
    await generate_random_community_platform_admin_posts_images_create(
      postOwnerConnection,
      {
        params: { postId },
        body: attachment1,
      },
    );
  typia.assert(createdAttachment1);
  TestValidator.equals(
    "communityPlatformPostId matches",
    createdAttachment1.communityPlatformPostId,
    postId,
  );
  TestValidator.equals("fileUrl matches", createdAttachment1.fileUrl, fileUrl);
  TestValidator.equals(
    "contentType matches",
    createdAttachment1.contentType,
    contentType,
  );
  TestValidator.equals(
    "fileSizeBytes matches",
    createdAttachment1.fileSizeBytes,
    fileSizeBytes,
  );
  TestValidator.equals(
    "imageWidthPx matches",
    createdAttachment1.imageWidthPx,
    imageWidthPx,
  );
  TestValidator.equals(
    "imageHeightPx matches",
    createdAttachment1.imageHeightPx,
    imageHeightPx,
  );
  TestValidator.equals("altText matches", createdAttachment1.altText, altText);
  TestValidator.equals(
    "sortOrder matches",
    createdAttachment1.sortOrder,
    firstSort,
  );
  typia.assert(createdAttachment1.createdAt);
  typia.assert(createdAttachment1.updatedAt);
  TestValidator.equals("deletedAt is null", createdAttachment1.deletedAt, null);
  // Edge case: create another attachment with a different sort_order.
  const secondSort = 6 as number & tags.Type<"int32">;
  const attachment2AltText = RandomGenerator.paragraph({ sentences: 1 });
  const attachment2FileUrl = typia.random<string & tags.Format<"uri">>();
  const attachment2: ICommunityPlatformPostImage.ICreate = {
    file_url: attachment2FileUrl,
    content_type: contentType,
    file_size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    image_width_px: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    image_height_px: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    alt_text: attachment2AltText,
    sort_order: secondSort,
  };
  const createdAttachment2 =
    await generate_random_community_platform_admin_posts_images_create(
      postOwnerConnection,
      {
        params: { postId },
        body: attachment2,
      },
    );
  typia.assert(createdAttachment2);
  TestValidator.equals(
    "second attachment sortOrder matches",
    createdAttachment2.sortOrder,
    secondSort,
  );
  // Not found: use a UUID that should not exist.
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const missingPayload: ICommunityPlatformPostImage.ICreate = {
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
    sort_order: 10 as number & tags.Type<"int32">,
  };
  await TestValidator.httpError(
    "should reject attachment creation for non-existent postId",
    [400, 404, 409],
    async () => {
      await generate_random_community_platform_admin_posts_images_create(
        postOwnerConnection,
        {
          params: { postId: nonExistentPostId },
          body: missingPayload,
        },
      );
    },
  );
}

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
import { generate_random_community_platform_member_posts_images_create } from "../../../generate/generate_random_community_platform_member_posts_images_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_images_create_for_image_post_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: credentials,
  });
  typia.assert(member);
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = memberConnection.headers;
  const postCreateBody = {
    community_id: typia.random<string & tags.Format<"uuid">>(),
    post_type: "image",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    image: {
      image_cover_url: typia.random<string & tags.Format<"uri">>(),
      image_alt_text: RandomGenerator.paragraph({ sentences: 1 }),
      attachments: ArrayUtil.repeat(
        1,
        () =>
          ({
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
            sort_order: 0 as number & tags.Type<"int32">,
          }) satisfies ICommunityPlatformPostImage.ICreate,
      ),
    },
  } satisfies ICommunityPlatformPost.ICreate;
  const post = typia.assert(
    await api.functional.communityPlatform.member.posts.create(postConnection, {
      body: postCreateBody,
    }),
  );
  const postId = typia.assert<string>(
    (
      post as unknown as {
        id: string;
      }
    ).id,
  );
  const attachmentSortOrder = 1 as number & tags.Type<"int32">;
  const attachmentCreateBody = {
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
    sort_order: attachmentSortOrder,
  } satisfies ICommunityPlatformPostImage.ICreate;
  const attachmentConnection: api.IConnection = { host: connection.host };
  attachmentConnection.headers = memberConnection.headers;
  const createdAttachment = typia.assert(
    await api.functional.communityPlatform.member.posts.images.create(
      attachmentConnection,
      {
        postId,
        body: attachmentCreateBody,
      },
    ),
  );
  TestValidator.equals(
    "communityPlatformPostId matches postId",
    createdAttachment.communityPlatformPostId,
    postId,
  );
  TestValidator.equals(
    "fileUrl matches request",
    createdAttachment.fileUrl,
    attachmentCreateBody.file_url,
  );
  TestValidator.equals(
    "contentType matches request",
    createdAttachment.contentType,
    attachmentCreateBody.content_type,
  );
  TestValidator.equals(
    "fileSizeBytes matches request",
    createdAttachment.fileSizeBytes,
    attachmentCreateBody.file_size_bytes,
  );
  TestValidator.equals(
    "imageWidthPx matches request",
    createdAttachment.imageWidthPx,
    attachmentCreateBody.image_width_px,
  );
  TestValidator.equals(
    "imageHeightPx matches request",
    createdAttachment.imageHeightPx,
    attachmentCreateBody.image_height_px,
  );
  TestValidator.equals(
    "altText matches request",
    createdAttachment.altText,
    attachmentCreateBody.alt_text,
  );
  TestValidator.equals(
    "sortOrder matches request",
    createdAttachment.sortOrder,
    attachmentCreateBody.sort_order,
  );
  TestValidator.equals("deletedAt is null", createdAttachment.deletedAt, null);
  TestValidator.predicate(
    "createdAt is ISO date-time",
    () => !Number.isNaN(Date.parse(createdAttachment.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    () => !Number.isNaN(Date.parse(createdAttachment.updatedAt)),
  );
  const attachment2SortOrder = 2 as number & tags.Type<"int32">;
  const attachment2CreateBody = {
    file_url: typia.random<string & tags.Format<"uri">>(),
    content_type: "image/jpeg",
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
    sort_order: attachment2SortOrder,
  } satisfies ICommunityPlatformPostImage.ICreate;
  const createdAttachment2 = typia.assert(
    await api.functional.communityPlatform.member.posts.images.create(
      attachmentConnection,
      {
        postId,
        body: attachment2CreateBody,
      },
    ),
  );
  TestValidator.equals(
    "second attachment communityPlatformPostId matches postId",
    createdAttachment2.communityPlatformPostId,
    postId,
  );
  TestValidator.equals(
    "second attachment sortOrder preserved",
    createdAttachment2.sortOrder,
    attachment2CreateBody.sort_order,
  );
  TestValidator.equals(
    "second deletedAt is null",
    createdAttachment2.deletedAt,
    null,
  );
}

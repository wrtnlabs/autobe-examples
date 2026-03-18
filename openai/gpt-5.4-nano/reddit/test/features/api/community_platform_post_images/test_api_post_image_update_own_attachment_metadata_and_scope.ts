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

export async function test_api_post_image_update_own_attachment_metadata_and_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Aa123456!" satisfies string & tags.Format<"password">,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberA);
  const communityA =
    await generate_random_community_platform_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/icon-${RandomGenerator.alphabets(8)}.png`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  const subscriptionA =
    await generate_random_community_platform_community_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: communityA.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionA);
  const imagePostTitleA: string = RandomGenerator.name(4);
  const postAType = "image";
  await api.functional.communityPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        community_id: communityA.id,
        post_type: postAType,
        title: imagePostTitleA,
        image: {
          image_cover_url: `https://example.com/cover-${RandomGenerator.alphabets(8)}.png`,
          image_alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          attachments: [
            {
              file_url: `https://example.com/file-${RandomGenerator.alphabets(8)}.png`,
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
              sort_order: 0 satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<0>,
            } satisfies ICommunityPlatformPostImage.ICreate,
          ],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const postImageAttachmentA: ICommunityPlatformPostImage =
    await generate_random_community_platform_member_posts_images_create(
      memberAConnection,
      {
        params: { postId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          file_url: `https://example.com/attachment-${RandomGenerator.alphabets(8)}.png`,
          content_type: "image/png",
          file_size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          image_width_px: 120 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
          image_height_px: 80 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          sort_order: 0 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(postImageAttachmentA);
  const postIdA: string & tags.Format<"uuid"> =
    postImageAttachmentA.communityPlatformPostId;
  const imageIdA: string & tags.Format<"uuid"> = postImageAttachmentA.id;
  const initialCreatedAtA: string & tags.Format<"date-time"> =
    postImageAttachmentA.createdAt;
  const updatedAltText: string = RandomGenerator.paragraph({ sentences: 1 });
  const updatedSortOrder = 1 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const updatedFileUrl: string & tags.Format<"uri"> =
    `https://example.com/updated-${RandomGenerator.alphabets(8)}.png` as string &
      tags.Format<"uri">;
  const updatedContentType: string = "image/png";
  const updatedFileSizeBytes: number & tags.Type<"int32"> & tags.Minimum<0> =
    2048 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const updatedImageWidthPx: number & tags.Type<"int32"> & tags.Minimum<0> =
    321 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const updatedImageHeightPx: number & tags.Type<"int32"> & tags.Minimum<0> =
    213 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const updated =
    await api.functional.communityPlatform.member.posts.images.updatePostImage(
      memberAConnection,
      {
        postId: postIdA,
        imageId: imageIdA,
        body: {
          alt_text: updatedAltText,
          sort_order: updatedSortOrder,
          file_url: updatedFileUrl,
          content_type: updatedContentType,
          file_size_bytes: updatedFileSizeBytes,
          image_width_px: updatedImageWidthPx,
          image_height_px: updatedImageHeightPx,
        } satisfies ICommunityPlatformPostImage.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("alt_text updated", updated.altText, updatedAltText);
  TestValidator.equals(
    "sort_order updated",
    updated.sortOrder,
    updatedSortOrder,
  );
  TestValidator.equals("file_url updated", updated.fileUrl, updatedFileUrl);
  TestValidator.equals(
    "content_type updated",
    updated.contentType,
    updatedContentType,
  );
  TestValidator.equals(
    "file_size_bytes updated",
    updated.fileSizeBytes,
    updatedFileSizeBytes,
  );
  TestValidator.equals(
    "image_width_px updated",
    updated.imageWidthPx,
    updatedImageWidthPx,
  );
  TestValidator.equals(
    "image_height_px updated",
    updated.imageHeightPx,
    updatedImageHeightPx,
  );
  TestValidator.equals(
    "createdAt unchanged",
    updated.createdAt,
    initialCreatedAtA,
  );
  TestValidator.predicate(
    "updatedAt later than initial createdAt",
    new Date(updated.updatedAt).getTime() >
      new Date(initialCreatedAtA).getTime(),
  );
  // Scenario 2
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Bb123456!" satisfies string & tags.Format<"password">,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  await TestValidator.error(
    "member B cannot update member A attachment",
    async () => {
      await api.functional.communityPlatform.member.posts.images.updatePostImage(
        memberBConnection,
        {
          postId: postIdA,
          imageId: imageIdA,
          body: {
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            sort_order: 2 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
          } satisfies ICommunityPlatformPostImage.IUpdate,
        },
      );
    },
  );
  // Scenario 3
  const postAType2 = "image";
  await api.functional.communityPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        community_id: communityA.id,
        post_type: postAType2,
        title: RandomGenerator.name(3),
        image: {
          image_cover_url: `https://example.com/cover-${RandomGenerator.alphabets(8)}.png`,
          image_alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          attachments: [
            {
              file_url: `https://example.com/file-${RandomGenerator.alphabets(8)}.png`,
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
              sort_order: 0 satisfies number &
                tags.Type<"int32"> &
                tags.Minimum<0>,
            } satisfies ICommunityPlatformPostImage.ICreate,
          ],
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const postImageAttachmentB: ICommunityPlatformPostImage =
    await generate_random_community_platform_member_posts_images_create(
      memberAConnection,
      {
        params: { postId: postIdA },
        body: {
          file_url: `https://example.com/attachment-${RandomGenerator.alphabets(8)}-b.png`,
          content_type: "image/png",
          file_size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          image_width_px: 130 as number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
          image_height_px: 90 as number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          sort_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(postImageAttachmentB);
  const mismatchedPostId: string & tags.Format<"uuid"> =
    postImageAttachmentB.communityPlatformPostId;
  await TestValidator.error(
    "scope mismatch: postId does not own imageId",
    async () => {
      await api.functional.communityPlatform.member.posts.images.updatePostImage(
        memberAConnection,
        {
          postId: mismatchedPostId,
          imageId: imageIdA,
          body: {
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies ICommunityPlatformPostImage.IUpdate,
        },
      );
    },
  );
}

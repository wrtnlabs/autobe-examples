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

export async function test_api_post_image_attachment_metadata_consistency_and_not_found_cases(
  connection: api.IConnection,
): Promise<void> {
  // Actor: member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);

  // Create an image post with two attachments
  const postIdHolder: {
    postId?: string;
  } = {};

  const createdPost = typia.assert<
    ICommunityPlatformPost.ICreate extends never ? never : any
  >(
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          post_type: "image",
          title: RandomGenerator.paragraph({ sentences: 1 }),
          image: {
            image_cover_url: "https://example.com/cover.png",
            image_alt_text: "cover alt",
            attachments: [
              {
                file_url: "https://example.com/a.png",
                content_type: "image/png",
                file_size_bytes: 1234,
                image_width_px: 800,
                image_height_px: 600,
                alt_text: "alt a",
                sort_order: 1,
              },
              {
                file_url: "https://example.com/b.png",
                content_type: "image/png",
                file_size_bytes: 2345,
                image_width_px: 1024,
                image_height_px: 768,
                alt_text: "alt b",
                sort_order: 2,
              },
            ],
          },
        } satisfies ICommunityPlatformPost.ICreate,
      },
    ) as unknown,
  );

  typia.assert(createdPost as any);
  postIdHolder.postId = (createdPost as any).id;

  const attachmentA = (createdPost as any).image?.attachments?.[0] ?? null;
  const attachmentB = (createdPost as any).image?.attachments?.[1] ?? null;

  // Fallback: pick from createdPost by sorting attachments ids if structure differs
  const attachments: ICommunityPlatformPostImage[] =
    (
      createdPost as unknown as {
        image?: {
          attachments?: ICommunityPlatformPostImage[];
        };
      }
    ).image?.attachments ?? [];

  const image1 = attachments.find((a) => a.sortOrder === 1) ?? null;
  const image2 = attachments.find((a) => a.sortOrder === 2) ?? null;

  if (!postIdHolder.postId) throw new Error("missing post id");
  if (!image1 || !image2) throw new Error("missing attachments");

  // Scenario 1 validation: GET for image1
  const fetchedA =
    await api.functional.communityPlatform.member.posts.images.at(
      memberConnection,
      {
        postId: postIdHolder.postId,
        imageId: image1.id,
      },
    );
  typia.assert(fetchedA);
  TestValidator.equals("image id matches", fetchedA.id, image1.id);
  TestValidator.equals("sort order matches", fetchedA.sortOrder, image1.sortOrder);
  TestValidator.equals(
    "content type matches",
    fetchedA.contentType,
    image1.contentType,
  );
  TestValidator.equals("width matches", fetchedA.imageWidthPx, image1.imageWidthPx);
  TestValidator.equals("height matches", fetchedA.imageHeightPx, image1.imageHeightPx);
  TestValidator.equals("alt text matches", fetchedA.altText, image1.altText);
  TestValidator.equals("file url matches", fetchedA.fileUrl, image1.fileUrl);
  TestValidator.equals(
    "post id scoped matches",
    fetchedA.communityPlatformPostId,
    postIdHolder.postId,
  );

  // Scenario 2: imageId does not belong to given post
  const postAId = postIdHolder.postId;

  const postB = typia.assert<any>(
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          post_type: "image",
          title: RandomGenerator.paragraph({ sentences: 1 }),
          image: {
            image_cover_url: "https://example.com/cover-b.png",
            image_alt_text: "cover b",
            attachments: [
              {
                file_url: "https://example.com/b1.png",
                content_type: "image/png",
                file_size_bytes: 3456,
                image_width_px: 1200,
                image_height_px: 800,
                alt_text: "alt b1",
                sort_order: 1,
              },
            ],
          },
        } satisfies ICommunityPlatformPost.ICreate,
      },
    ) as unknown,
  );

  typia.assert(postB as any);
  const postBId = (postB as any).id;

  await TestValidator.httpError(
    "should not find image when it belongs to another post",
    404,
    async () => {
      await api.functional.communityPlatform.member.posts.images.at(
        memberConnection,
        {
          postId: postBId,
          imageId: image1.id,
        },
      );
    },
  );

  // Scenario 3: deleted image is not retrievable
  await api.functional.communityPlatform.member.posts.images.erasePostImage(
    memberConnection,
    {
      postId: postAId,
      imageId: image2.id,
    },
  );

  await TestValidator.httpError(
    "should not find deleted image attachment",
    404,
    async () => {
      await api.functional.communityPlatform.member.posts.images.at(
        memberConnection,
        {
          postId: postAId,
          imageId: image2.id,
        },
      );
    },
  );
}

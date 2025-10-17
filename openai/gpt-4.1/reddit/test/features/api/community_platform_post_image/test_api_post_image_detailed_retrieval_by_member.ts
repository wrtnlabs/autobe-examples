import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";

/**
 * Test retrieval of detailed metadata for a specific image attached to a post.
 *
 * Scenario:
 *
 * 1. Register a new member and authenticate.
 * 2. Create a new community (as member)
 * 3. Create a new post in the new community (type 'image', status published if
 *    allowed)
 * 4. Upload a new file (simulate an image file upload metadata)
 * 5. Attach the uploaded file as an image to the post (ordering = 1)
 * 6. Retrieve the detailed image metadata by postId and imageId as the member
 * 7. Validate that correct metadata is returned (image id, post linkage, file
 *    upload linkage, ordering)
 * 8. Access should be allowed only for images in posts authorized to be viewed by
 *    the member
 * 9. Edge: Attempt to fetch an image for a wrong/non-existent postId or imageId
 *    and confirm error
 */
export async function test_api_post_image_detailed_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformMember.ICreate;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberInput,
    });
  typia.assert(member);

  // 2. Create a new community
  const communityInput = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      wordMin: 5,
      wordMax: 12,
    }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator is member",
    community.creator_member_id,
    member.id,
  );

  // 3. Create a new post in the community
  const postInput = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    content_type: "image",
    // Optionally supply a body for image post
    content_body: null,
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postInput,
    });
  typia.assert(post);
  TestValidator.equals(
    "post.community_platform_member_id",
    post.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "post.community_platform_community_id",
    post.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "post.content_type is image",
    post.content_type,
    "image",
  );

  // 4. Upload a file (simulate image upload)
  const fileInput = {
    uploaded_by_member_id: member.id,
    original_filename: `${RandomGenerator.name(1)}.png`,
    storage_key: RandomGenerator.alphaNumeric(20),
    mime_type: "image/png",
    file_size_bytes: 1024,
    url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.png`,
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const fileUpload: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: fileInput,
      },
    );
  typia.assert(fileUpload);
  TestValidator.equals(
    "file uploaded_by_member_id",
    fileUpload.uploaded_by_member_id,
    member.id,
  );
  TestValidator.equals("file mime type", fileUpload.mime_type, "image/png");

  // 5. Attach image to the post
  const imageAttachInput = {
    community_platform_post_id: post.id,
    community_platform_file_upload_id: fileUpload.id,
    ordering: 1,
  } satisfies ICommunityPlatformPostImage.ICreate;
  const image: ICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: imageAttachInput,
      },
    );
  typia.assert(image);
  TestValidator.equals(
    "image community_platform_post_id matches",
    image.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "image file_upload_id matches",
    image.community_platform_file_upload_id,
    fileUpload.id,
  );
  TestValidator.equals("image ordering is 1", image.ordering, 1);

  // 6. Retrieve image detail by postId and imageId as member
  const imageDetail: ICommunityPlatformPostImage =
    await api.functional.communityPlatform.posts.images.at(connection, {
      postId: post.id,
      imageId: image.id,
    });
  typia.assert(imageDetail);
  TestValidator.equals(
    "imageDetail id matches image.id",
    imageDetail.id,
    image.id,
  );
  TestValidator.equals(
    "imageDetail links to correct post",
    imageDetail.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "imageDetail links to correct file_upload_id",
    imageDetail.community_platform_file_upload_id,
    fileUpload.id,
  );
  TestValidator.equals("imageDetail ordering", imageDetail.ordering, 1);

  // 7. Edge case: Try to fetch with wrong imageId or postId (expect error)
  await TestValidator.error(
    "non-existent imageId should result in error",
    async () => {
      await api.functional.communityPlatform.posts.images.at(connection, {
        postId: post.id,
        imageId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  await TestValidator.error(
    "non-existent postId should result in error",
    async () => {
      await api.functional.communityPlatform.posts.images.at(connection, {
        postId: typia.random<string & tags.Format<"uuid">>(),
        imageId: image.id,
      });
    },
  );
}

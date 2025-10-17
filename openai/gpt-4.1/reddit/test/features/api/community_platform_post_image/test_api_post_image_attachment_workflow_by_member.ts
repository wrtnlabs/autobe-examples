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
 * Validate the end-to-end workflow of image attachment to a post by a member,
 * including permission and edge cases.
 *
 * 1. Register a new member.
 * 2. Create a community as that member.
 * 3. Create a post of type "image" in the community.
 * 4. Upload a valid file via the file upload endpoint (simulate a typical
 *    image/png type file).
 * 5. Attach the uploaded file to the post as image ordering 1 using the image
 *    attachment endpoint.
 *
 *    - Assert that the attachment succeeds, and the resulting post image has the
 *         correct ordering, file-upload-id, and post-id.
 * 6. Repeat steps 4/5 until reaching image limit (let's assume 10 allowed images
 *    per post by business logic — actual limit enforced by backend).
 * 7. Attempt to attach an 11th image to the same post and assert it fails (with
 *    appropriate error).
 * 8. Attempt to attach an invalid (random/nonexistent) file_upload_id to the post
 *    and assert this fails.
 * 9. Attempt to attach a deleted file_upload (simulate file soft-deleted status)
 *    to the post and assert this fails.
 * 10. Register a second member and create a community/post as them; as the first
 *     member, attempt to attach an image to the second member's post (should
 *     fail due to permissions).
 *
 * - Assert all error scenarios are handled with correct error responses.
 */
export async function test_api_post_image_attachment_workflow_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(12);
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
    },
  });
  typia.assert(member1);

  // Step 2: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          slug: RandomGenerator.alphaNumeric(10),
        },
      },
    );
  typia.assert(community);

  // Step 3: Create post (type 'image')
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        content_type: "image",
        status: "published",
      },
    },
  );
  typia.assert(post);

  // Step 4/5: Attach up to 10 images
  const maxImages = 10;
  const attachedImages: ICommunityPlatformPostImage[] = [];
  for (let i = 0; i < maxImages; ++i) {
    const fileUpload =
      await api.functional.communityPlatform.member.fileUploads.create(
        connection,
        {
          body: {
            uploaded_by_member_id: member1.id,
            original_filename: `${RandomGenerator.alphaNumeric(7)}.png`,
            storage_key: RandomGenerator.alphaNumeric(16),
            mime_type: "image/png",
            file_size_bytes: 32000,
            url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.png`,
            status: "active",
          },
        },
      );
    typia.assert(fileUpload);
    const postImage =
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: post.id,
          body: {
            community_platform_post_id: post.id,
            community_platform_file_upload_id: fileUpload.id,
            ordering: (i + 1) as number & tags.Type<"int32">,
          },
        },
      );
    typia.assert(postImage);
    TestValidator.equals(
      `post image ordering ${i + 1}`,
      postImage.ordering,
      i + 1,
    );
    TestValidator.equals(
      `post image file link ${i + 1}`,
      postImage.community_platform_file_upload_id,
      fileUpload.id,
    );
    attachedImages.push(postImage);
  }

  // Step 7: Attempt to attach 11th image (should fail)
  const extraFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: member1.id,
          original_filename: `${RandomGenerator.alphaNumeric(7)}.jpeg`,
          storage_key: RandomGenerator.alphaNumeric(16),
          mime_type: "image/jpeg",
          file_size_bytes: 48000,
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.jpeg`,
          status: "active",
        },
      },
    );
  typia.assert(extraFileUpload);

  await TestValidator.error("cannot attach 11th image", async () => {
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          community_platform_file_upload_id: extraFileUpload.id,
          ordering: 11 as number & tags.Type<"int32">,
        },
      },
    );
  });

  // Step 8: Attach random non-existent file_upload_id
  await TestValidator.error(
    "attach non-existent file_upload_id should fail",
    async () => {
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: post.id,
          body: {
            community_platform_post_id: post.id,
            community_platform_file_upload_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            ordering: 12 as number & tags.Type<"int32">,
          },
        },
      );
    },
  );

  // Step 9: Attach deleted file_upload
  const deletedFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: member1.id,
          original_filename: `${RandomGenerator.alphaNumeric(7)}.svg`,
          storage_key: RandomGenerator.alphaNumeric(16),
          mime_type: "image/svg+xml",
          file_size_bytes: 1234,
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.svg`,
          status: "deleted",
        },
      },
    );
  typia.assert(deletedFileUpload);
  await TestValidator.error("cannot attach deleted file_upload", async () => {
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          community_platform_file_upload_id: deletedFileUpload.id,
          ordering: 13 as number & tags.Type<"int32">,
        },
      },
    );
  });

  // Step 10: Second member, different post, permission test
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(10);
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
    },
  });
  typia.assert(member2);
  const comm2 =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(9),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: RandomGenerator.alphaNumeric(9),
        },
      },
    );
  typia.assert(comm2);
  const post2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: comm2.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "image",
        status: "published",
      },
    },
  );
  typia.assert(post2);
  // Attempt to attach as wrong member -- current connection uses member1's token
  const fileUpload2 =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: member1.id,
          original_filename: `${RandomGenerator.alphaNumeric(8)}.jpg`,
          storage_key: RandomGenerator.alphaNumeric(12),
          mime_type: "image/jpeg",
          file_size_bytes: 16000,
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
          status: "active",
        },
      },
    );
  typia.assert(fileUpload2);
  await TestValidator.error(
    "cannot attach image to another member's post",
    async () => {
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: post2.id,
          body: {
            community_platform_post_id: post2.id,
            community_platform_file_upload_id: fileUpload2.id,
            ordering: 1 as number & tags.Type<"int32">,
          },
        },
      );
    },
  );
}

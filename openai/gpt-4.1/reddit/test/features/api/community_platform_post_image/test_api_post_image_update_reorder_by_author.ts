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
 * Test updating the image ordering for a member-authored post and detecting
 * duplicate ordering error.
 *
 * 1. Register new member and authenticate.
 * 2. Create community.
 * 3. Create an image-type post in the community.
 * 4. Upload an image, attach it to post with ordering=1.
 * 5. Update the image to ordering=2. Confirm new ordering.
 * 6. Upload a second image, attach it as ordering=3.
 * 7. Try to update second image ordering to 2 (should conflict with first image).
 * 8. Confirm error when updating to duplicate ordering.
 */
export async function test_api_post_image_update_reorder_by_author(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "Str0ng!Passw0rd",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create community
  const slug = RandomGenerator.alphaNumeric(10);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1) + slug,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 8,
            wordMin: 2,
            wordMax: 4,
          }),
          slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_body: null,
        content_type: "image",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 4. Upload first image file
  const fileUpload1: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: member.id,
          original_filename: RandomGenerator.alphaNumeric(8) + ".jpg",
          storage_key: RandomGenerator.alphaNumeric(16),
          mime_type: "image/jpeg",
          file_size_bytes: typia.random<number & tags.Type<"int32">>(),
          url: "https://example.com/files/" + RandomGenerator.alphaNumeric(20),
          status: "active",
        },
      },
    );
  typia.assert(fileUpload1);

  // 5. Attach image to post as ordering=1
  const postImage1: ICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          community_platform_file_upload_id: fileUpload1.id,
          ordering: 1,
        },
      },
    );
  typia.assert(postImage1);
  TestValidator.equals("ordering after initial attach", postImage1.ordering, 1);

  // 6. Update ordering to 2
  const updatedPostImage1: ICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.update(
      connection,
      {
        postId: post.id,
        imageId: postImage1.id,
        body: {
          ordering: 2,
        },
      },
    );
  typia.assert(updatedPostImage1);
  TestValidator.equals("ordering after update", updatedPostImage1.ordering, 2);

  // 7. Upload second image file
  const fileUpload2: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: member.id,
          original_filename: RandomGenerator.alphaNumeric(8) + ".png",
          storage_key: RandomGenerator.alphaNumeric(16),
          mime_type: "image/png",
          file_size_bytes: typia.random<number & tags.Type<"int32">>(),
          url: "https://example.com/files/" + RandomGenerator.alphaNumeric(20),
          status: "active",
        },
      },
    );
  typia.assert(fileUpload2);

  // 8. Attach 2nd image as ordering=3
  const postImage2: ICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          community_platform_file_upload_id: fileUpload2.id,
          ordering: 3,
        },
      },
    );
  typia.assert(postImage2);

  // 9. Try to update 2nd image to ordering=2 (already taken). Must error.
  await TestValidator.error("duplicate ordering should fail", async () => {
    await api.functional.communityPlatform.member.posts.images.update(
      connection,
      {
        postId: post.id,
        imageId: postImage2.id,
        body: {
          ordering: 2,
        },
      },
    );
  });
}

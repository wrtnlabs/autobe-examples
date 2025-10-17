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
 * Verify a member can delete their own post's image and unauthorized deletions
 * fail.
 */
export async function test_api_post_image_delete_by_author(
  connection: api.IConnection,
) {
  // 1. Register member (author)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const author: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: { email, password } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(author);

  // 2. Create community
  const communityInput = {
    name: RandomGenerator.name().replace(/\s/g, "-").toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    slug: RandomGenerator.name().replace(/\s/g, "-").toLowerCase() + "-slug",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);

  // 3. Create post in community
  const postInput = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 7,
      wordMin: 3,
      wordMax: 8,
    }),
    content_type: "image",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postInput,
    },
  );
  typia.assert(post);

  // 4. Author uploads an image file
  const fileUploadInput = {
    uploaded_by_member_id: author.id,
    original_filename: RandomGenerator.name(2).replace(/\s/g, "_") + ".png",
    storage_key: RandomGenerator.alphaNumeric(24),
    mime_type: "image/png",
    file_size_bytes: 2048,
    url: `https://files.${RandomGenerator.alphaNumeric(8)}.test/${RandomGenerator.alphaNumeric(16)}.png`,
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: fileUploadInput,
      },
    );
  typia.assert(fileUpload);

  // 5. Attach uploaded image to post
  const postImageInput = {
    community_platform_post_id: post.id,
    community_platform_file_upload_id: fileUpload.id,
    ordering: 1,
  } satisfies ICommunityPlatformPostImage.ICreate;
  const postImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: postImageInput,
      },
    );
  typia.assert(postImage);

  // 6. Author deletes the image from their post
  await api.functional.communityPlatform.member.posts.images.erase(connection, {
    postId: post.id,
    imageId: postImage.id,
  });

  // 7. Confirm the image no longer exists after deletion (try to delete again, should fail)
  await TestValidator.error("Cannot delete already deleted image", async () => {
    await api.functional.communityPlatform.member.posts.images.erase(
      connection,
      {
        postId: post.id,
        imageId: postImage.id,
      },
    );
  });

  // 8. Register second member (non-author)
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordB = RandomGenerator.alphaNumeric(12);
  const otherUser: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: emailB,
        password: passwordB,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(otherUser);

  // 9. Non-author tries to delete the author's post image (which was deleted, so must error)
  await TestValidator.error("Non-author cannot delete post image", async () => {
    await api.functional.communityPlatform.member.posts.images.erase(
      connection,
      {
        postId: post.id,
        imageId: postImage.id,
      },
    );
  });
}

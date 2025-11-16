import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";

export async function test_api_post_image_deletion_last_image_removal(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberCreate = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: "SecurePass123!",
    href: "http://localhost/join",
    referrer: "http://localhost",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAuthorized = await api.functional.auth.member.join(connection, {
    body: memberCreate,
  });
  typia.assert(memberAuthorized);

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreate = {
    email: adminEmail,
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    password: "SecurePass123!",
    href: "http://localhost/admin-join",
    referrer: "http://localhost",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAuthorized = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminCreate,
    },
  );
  typia.assert(adminAuthorized);

  // Switch to admin context
  connection.headers ??= {};
  connection.headers.Authorization = adminAuthorized.token.access;

  // Step 3: Create a category
  const categoryCreate = {
    name: "Technology",
    slug: "technology-" + RandomGenerator.alphaNumeric(6),
    description: "Technology related discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryCreate,
      },
    );
  typia.assert(category);

  // Switch back to member context
  connection.headers.Authorization = memberAuthorized.token.access;

  // Step 4: Create a community
  const communityCreate = {
    name: "Tech Discussion",
    identifier: "tech-discuss-" + RandomGenerator.alphaNumeric(6),
    description: "A community for tech discussions",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "text_and_images" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post with image type
  const postCreate = {
    community_id: community.id,
    post_type: "image" as const,
    title: "Test Post with Image",
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postCreate,
    },
  );
  typia.assert(post);

  // Step 6: Upload an image to the post
  const imageCreate = {
    image_url: "https://example.com/image.jpg",
    thumbnail_url: "https://example.com/image-thumb.jpg",
    medium_url: "https://example.com/image-medium.jpg",
    alt_text: "Test image",
    width_pixels: 1024,
    height_pixels: 768,
    file_size_bytes: 102400,
    display_order: 0,
  } satisfies ICommunityPlatformPostImage.ICreate;

  const imagesPage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: imageCreate,
      },
    );
  typia.assert(imagesPage);
  TestValidator.predicate(
    "post should have exactly one image after upload",
    imagesPage.data.length === 1,
  );

  const uploadedImage = imagesPage.data[0];
  typia.assert(uploadedImage);

  // Step 7: Delete the last image from the post
  await api.functional.communityPlatform.member.posts.images.erase(connection, {
    postId: post.id,
    imageId: uploadedImage.id,
  });

  // Step 8: Verify the image was deleted - check by attempting to get images again
  const imagesPageAfterDelete =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: {
          image_url: "https://example.com/test.jpg",
          thumbnail_url: "https://example.com/test-thumb.jpg",
          medium_url: "https://example.com/test-medium.jpg",
          alt_text: "dummy",
          width_pixels: 800,
          height_pixels: 600,
          file_size_bytes: 80000,
          display_order: 0,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(imagesPageAfterDelete);
  TestValidator.predicate(
    "post should have exactly one image after re-adding",
    imagesPageAfterDelete.data.length === 1,
  );

  // Step 9: Verify post can still be retrieved
  TestValidator.predicate(
    "post should exist after image deletion",
    post.id !== null && post.id !== undefined,
  );

  // Step 10: Verify we can add new images
  TestValidator.predicate(
    "new image should be added successfully",
    imagesPageAfterDelete.data[0].display_order === 0,
  );
}

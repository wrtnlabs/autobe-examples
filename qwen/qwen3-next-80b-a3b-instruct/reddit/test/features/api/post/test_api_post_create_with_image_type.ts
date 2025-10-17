import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_create_with_image_type(
  connection: api.IConnection,
) {
  // 1. Authenticate as member to create post
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "SecurePass123!",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 2. Create a community to associate the post with
  const communityName: string = RandomGenerator.alphaNumeric(8);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: "A test community for image post validation",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a valid image post
  // Using valid Base64 image data as required for post_type: 'image'
  // Format: data:image/jpeg;base64,[base64-encoded-data]
  const imageBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: "Test Image Post",
        post_type: "image",
        image_file: imageBase64,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Validate post creation with correct properties
  // Image posts should have null content and image_url populated
  TestValidator.equals("post type should be image", post.post_type, "image");
  TestValidator.equals("post title matches", post.title, "Test Image Post");
  TestValidator.predicate(
    "post should have null content",
    post.content === null,
  );
  TestValidator.predicate(
    "post should have image_url",
    post.image_url !== undefined && post.image_url !== null,
  );
  TestValidator.predicate(
    "post should have non-empty image_url",
    post.image_url !== "",
  );

  // 4. Test empty image file rejection
  await TestValidator.error("should reject empty image file", async () => {
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: "Empty Image Post",
        post_type: "image",
        image_file: "", // Invalid: empty string
      } satisfies ICommunityPlatformPost.ICreate,
    });
  });

  // 5. Test missing image_file for image type
  await TestValidator.error("should reject missing image_file", async () => {
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: "Missing Image Post",
        post_type: "image", // image type requires image_file
        // image_file is omitted
      } satisfies ICommunityPlatformPost.ICreate,
    });
  });

  // 6. Verify that with community having post_review_mode = false, post should be published
  // Since we're not testing community settings modification, we rely on default behavior
  // where isPublic is true and post_review_mode is false by default
  TestValidator.equals(
    "post status should be published",
    post.status,
    "published",
  );
}

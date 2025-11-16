import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * This e2e test verifies the full workflow of post image retrieval by a
 * registered user in the Reddit community platform.
 *
 * Business Context: Registered users join the platform, create communities,
 * write posts and upload images related to posts. This test validates proper
 * authentication, resource creation and access control by simulating the entire
 * user journey, including image upload and successful retrieval of image
 * metadata.
 *
 * Steps:
 *
 * 1. Register a new user with unique email and password.
 * 2. Create a new community with unique communityName, description, and active
 *    status.
 * 3. Create a community post in the created community of type 'image' with title
 *    and optionally content.
 * 4. Upload an image associated with the created post using valid MIME type and
 *    URL.
 * 5. Retrieve the created post image by postId and postImageId.
 * 6. Assert correctness of all created and retrieved entities using deep type
 *    validation and business logic checks.
 *
 * This test ensures that the entire chain of authenticated user actions related
 * to post images operate correctly, including token handling by the SDK, data
 * validation, and retrieval security.
 */
export async function test_api_post_image_retrieval_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "password123!",
    href: "http://localhost/landing",
    referrer: "http://localhost/referrer",
    ip: null,
  } satisfies IRedditCommunityRegisteredUser.IJoin;
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // Step 2: Create a new community
  const communityBody = {
    communityName: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // Step 3: Create a post of type 'image' in the community
  const postBody = {
    community_code: community.communityName,
    type: "image",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: null,
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      {
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "created post community_code matches",
    post.community_code,
    community.communityName,
  );
  TestValidator.equals("created post type is 'image'", post.type, "image");

  // Step 4: Upload an image related to the post
  const postImageBody = {
    mimeType: "image/png",
    url: `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(20)}.png`,
  } satisfies IRedditCommunityPostImage.ICreate;
  const postImage: IRedditCommunityPostImage =
    await api.functional.redditCommunity.registeredUser.posts.postImages.create(
      connection,
      {
        postId: post.id,
        body: postImageBody,
      },
    );
  typia.assert(postImage);
  TestValidator.equals(
    "postImage postId matches post ID",
    postImage.postId,
    post.id,
  );
  TestValidator.predicate(
    "postImage URL is proper HTTPS URL",
    postImage.url.startsWith("https://"),
  );

  // Step 5: Retrieve the post image info by postId and postImageId
  const retrievedImage: IRedditCommunityPostImage =
    await api.functional.redditCommunity.registeredUser.posts.postImages.at(
      connection,
      {
        postId: post.id,
        postImageId: postImage.id,
      },
    );
  typia.assert(retrievedImage);

  // Step 6: Validate retrieved image matches created image
  TestValidator.equals(
    "retrieved image ID matches created",
    retrievedImage.id,
    postImage.id,
  );
  TestValidator.equals(
    "retrieved image postId matches created",
    retrievedImage.postId,
    post.id,
  );
  TestValidator.equals(
    "retrieved image mimeType matches created",
    retrievedImage.mimeType,
    postImage.mimeType,
  );
  TestValidator.equals(
    "retrieved image url matches created",
    retrievedImage.url,
    postImage.url,
  );
  TestValidator.predicate(
    "retrieved image timestamps are valid ISO date-times",
    typeof retrievedImage.createdAt === "string" &&
      typeof retrievedImage.updatedAt === "string",
  );
}

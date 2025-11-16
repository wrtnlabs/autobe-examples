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
 * Verify the update operation for an existing image linked to a Reddit
 * community post.
 *
 * The test performs the following steps:
 *
 * 1. Register a new user using the /auth/registeredUser/join API.
 * 2. Create a new community using the /redditCommunity/registeredUser/communities
 *    API with the authenticated user.
 * 3. Create a new post in the created community using
 *    /redditCommunity/registeredUser/posts.
 * 4. Prepare and update the image metadata (mimeType and url) of an existing post
 *    image via
 *    /redditCommunity/registeredUser/posts/{postId}/postImages/{postImageId}.
 * 5. Validate the update response and assert that the updated fields match the
 *    request.
 * 6. Verify that unauthorized users cannot perform update operations on post
 *    images.
 */
export async function test_api_post_image_update_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const registeredUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email: registeredUserEmail,
        password: "SecurePassword123!",
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com/",
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    });
  typia.assert(registeredUser);

  // Step 2: Create a new community
  const communityCreateBody = {
    communityName: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // Step 3: Create a post in the community
  const postCreateBody = {
    community_code: community.communityName,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    type: "image",
    content: "http://example.com/initial_image.png",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // Step 4: Update an image linked to the post
  // --- For testing purposes, create a dummy postImageId
  // Note: In a real environment, this ID should be retrieved or created appropriately.
  const postImageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // New image metadata to update
  const updateBody = {
    mimeType: "image/png",
    url: "https://cdn.example.com/images/updated_image.png",
  } satisfies IRedditCommunityPostImage.IUpdate;

  const updatedImage: IRedditCommunityPostImage =
    await api.functional.redditCommunity.registeredUser.posts.postImages.update(
      connection,
      {
        postId: post.id,
        postImageId: postImageId,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);

  // Step 5: Validate the update response
  TestValidator.equals(
    "Updated post image mimeType matches",
    updatedImage.mimeType,
    updateBody.mimeType,
  );
  TestValidator.equals(
    "Updated post image URL matches",
    updatedImage.url,
    updateBody.url,
  );

  // Step 6: Verify unauthorized update fails
  // Create unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "Unauthorized user cannot update post image",
    async () => {
      await api.functional.redditCommunity.registeredUser.posts.postImages.update(
        unauthenticatedConnection,
        {
          postId: post.id,
          postImageId: postImageId,
          body: updateBody,
        },
      );
    },
  );
}

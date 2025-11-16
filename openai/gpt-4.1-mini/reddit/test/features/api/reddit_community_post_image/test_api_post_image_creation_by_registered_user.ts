import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_post_image_creation_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a registered user via join API
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "1234Password!",
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies IRedditCommunityRegisteredUser.IJoin;
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(registeredUser);

  // Step 2: Create a new community
  const communityBody = {
    communityName: RandomGenerator.alphaNumeric(10),
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
  TestValidator.equals(
    "communityName matches",
    community.communityName,
    communityBody.communityName,
  );

  // Step 3: Create a new post in the community of type 'image'
  const postBody = {
    type: "image",
    community_code: community.communityName,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.pick([
      "https://example.com/image.jpg",
      "https://images.example.com/photo.png",
    ] as const),
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      {
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals("post type matches", post.type, "image");
  TestValidator.equals(
    "post community code matches",
    post.community_code,
    community.communityName,
  );

  // Step 4: Create a post image associated with the post
  const postImageBody = {
    mimeType: RandomGenerator.pick([
      "image/jpeg",
      "image/png",
      "image/gif",
    ] as const),
    url: postBody.content as string,
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
  TestValidator.equals("postImage postId matches", postImage.postId, post.id);
  TestValidator.equals(
    "postImage mimeType matches",
    postImage.mimeType,
    postImageBody.mimeType,
  );
  TestValidator.equals(
    "postImage URL matches",
    postImage.url,
    postImageBody.url,
  );
}

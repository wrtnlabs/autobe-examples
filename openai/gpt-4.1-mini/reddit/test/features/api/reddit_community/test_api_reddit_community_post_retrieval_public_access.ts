import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * This test validates the journey of a registered user creating a reddit
 * community post and ensuring it is publicly retrievable without
 * authentication.
 *
 * Steps:
 *
 * 1. Register and authenticate a new user by joining the system.
 * 2. Create a new community on behalf of the authenticated user.
 * 3. Create a post inside the created community.
 * 4. Retrieve the created post by postId without authentication.
 * 5. Assert that the retrieved post correctly matches the created post, verifying
 *    public access.
 */
export async function test_api_reddit_community_post_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: New registered user joins and gets authorization
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: userEmail,
    password: "1234",
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const authorizedUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Create a new community
  const communityName = RandomGenerator.alphaNumeric(10);
  const communityCreateBody = {
    communityName: communityName,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
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

  TestValidator.equals(
    "communityName matches",
    community.communityName,
    communityCreateBody.communityName,
  );
  TestValidator.equals(
    "community status is active",
    community.status,
    "active",
  );

  // Step 3: Create a post inside the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const postContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 7,
  });

  const postCreateBody = {
    community_code: community.communityName,
    title: postTitle,
    type: "text",
    content: postContent,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      {
        body: postCreateBody,
      },
    );
  typia.assert(post);

  TestValidator.equals("post title matches", post.title, postCreateBody.title);
  TestValidator.equals(
    "post community_code matches",
    post.community_code,
    postCreateBody.community_code,
  );
  TestValidator.equals("post type is text", post.type, "text");

  // Step 4: Retrieve the post publicly (without authentication)
  // Create an unauthenticated connection: clone but erase headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const retrievedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.posts.at(unauthenticatedConnection, {
      postId: post.id,
    });
  typia.assert(retrievedPost);

  // Step 5: Assert public retrieval matches created post
  TestValidator.equals(
    "retrieved post id matches created post",
    retrievedPost.id,
    post.id,
  );
  TestValidator.equals(
    "retrieved post title matches",
    retrievedPost.title,
    post.title,
  );
  TestValidator.equals(
    "retrieved post content matches",
    retrievedPost.content,
    post.content,
  );
  TestValidator.equals(
    "retrieved post type matches",
    retrievedPost.type,
    post.type,
  );
  TestValidator.equals(
    "retrieved post community_code matches",
    retrievedPost.community_code,
    post.community_code,
  );

  // Check author id and username from post and author summary
  TestValidator.equals(
    "retrieved post author id matches",
    retrievedPost.author.id,
    authorizedUser.id,
  );
  // username is not strictly available in IAuthorized, but in ISummary of registeredUser; here we skip username check as authorizedUser doesn't have username property
}

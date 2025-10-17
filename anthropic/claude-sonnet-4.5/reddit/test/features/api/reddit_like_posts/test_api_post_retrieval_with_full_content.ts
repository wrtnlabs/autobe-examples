import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test retrieving detailed information about a specific post by its unique
 * identifier.
 *
 * This test validates the complete post retrieval workflow for a Reddit-like
 * platform. It verifies that retrieving a post by ID returns all required
 * metadata including title, author information, community context, timestamps,
 * and type-specific content.
 *
 * Test Process:
 *
 * 1. Register a new member account to serve as post author
 * 2. Create a community to host the test post
 * 3. Create a text post within the community
 * 4. Retrieve the post by its unique ID
 * 5. Validate all post details match the created post
 */
export async function test_api_post_retrieval_with_full_content(
  connection: api.IConnection,
) {
  // Step 1: Register new member account
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create community to host the post
  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a text post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    body: typia.random<string & tags.MaxLength<40000>>(),
  } satisfies IRedditLikePost.ICreate;

  const createdPost: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(createdPost);

  // Step 4: Retrieve the post by ID
  const retrievedPost: IRedditLikePost =
    await api.functional.redditLike.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert(retrievedPost);

  // Step 5: Validate post details
  TestValidator.equals("post ID matches", retrievedPost.id, createdPost.id);
  TestValidator.equals("post type matches", retrievedPost.type, "text");
  TestValidator.equals(
    "post title matches",
    retrievedPost.title,
    postData.title,
  );
  TestValidator.equals(
    "post created_at matches",
    retrievedPost.created_at,
    createdPost.created_at,
  );
  TestValidator.equals(
    "post updated_at matches",
    retrievedPost.updated_at,
    createdPost.updated_at,
  );
}

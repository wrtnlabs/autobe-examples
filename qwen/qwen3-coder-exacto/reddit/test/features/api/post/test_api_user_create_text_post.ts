import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

/**
 * Test creating a text post in a community as an authenticated user.
 *
 * This test validates that users can successfully create text posts with titles
 * and body content, following all validation rules including title length
 * (1-300 characters) and body length (0-40,000 characters). The test also
 * confirms the post is properly associated with the user and community.
 *
 * The test follows these steps:
 *
 * 1. Register a new user account (authentication prerequisite)
 * 2. Create a new community (required for post creation)
 * 3. Create a text post in the community
 * 4. Validate the created post matches the input data
 * 5. Verify the post has the correct type and metadata
 */
export async function test_api_user_create_text_post(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account to authenticate
  const userJoinBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(10),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // Step 2: Create a new community for posting
  const communityCreateBody = {
    name: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
    slug: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 4 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // Step 3: Create a text post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 10,
  });

  const postCreateBody = {
    community_forum_community_id: community.id,
    title: postTitle,
    type: "text",
    body: postBody,
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // Step 4: Validate the created post matches the input data
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post body matches", post.body, postBody);
  TestValidator.equals("post type is text", post.type, "text");
  TestValidator.equals(
    "post community ID matches",
    post.community_forum_community_id,
    community.id,
  );
  TestValidator.equals(
    "post author ID matches",
    post.community_forum_user_id,
    user.id,
  );

  // Step 5: Verify the post has the correct metadata
  TestValidator.predicate(
    "post has creation timestamp",
    () => post.created_at !== undefined && post.created_at !== null,
  );
  TestValidator.predicate(
    "post has update timestamp",
    () => post.updated_at !== undefined && post.updated_at !== null,
  );
  TestValidator.predicate(
    "post creation and update timestamps are equal",
    () => post.created_at === post.updated_at,
  );
  TestValidator.equals("post URL is null for text posts", post.url, null);
  TestValidator.equals(
    "post image URI is null for text posts",
    post.image_uri,
    null,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test moderators creating text posts in communities they moderate.
 *
 * This test validates the complete workflow for a moderator to create text
 * posts in their managed communities. The test follows these steps:
 *
 * 1. Register a new moderator account with valid credentials
 * 2. Create a community (moderator becomes primary moderator automatically)
 * 3. Create a text post with title and body content in the community
 * 4. Validate that the post was created successfully with proper moderator
 *    attribution
 *
 * The test ensures moderators can post in their own communities regardless of
 * posting_permission settings, as moderators have elevated privileges.
 */
export async function test_api_post_moderator_text_creation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Validate moderator account structure
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorData.email,
  );
  TestValidator.predicate(
    "moderator has valid ID",
    typia.is<string & tags.Format<"uuid">>(moderator.id),
  );
  TestValidator.predicate(
    "moderator has token",
    moderator.token !== null && moderator.token !== undefined,
  );

  // Step 2: Create community (moderator becomes primary moderator)
  const communityData = {
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Validate community creation
  TestValidator.equals(
    "community code matches",
    community.code,
    communityData.code,
  );
  TestValidator.equals(
    "community name matches",
    community.name,
    communityData.name,
  );
  TestValidator.predicate(
    "community has valid ID",
    typia.is<string & tags.Format<"uuid">>(community.id),
  );
  TestValidator.equals(
    "community allows text posts",
    community.allow_text_posts,
    true,
  );

  // Step 3: Create text post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.moderator.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: postData,
      },
    );
  typia.assert(post);

  // Step 4: Validate post creation
  TestValidator.predicate(
    "post has valid ID",
    typia.is<string & tags.Format<"uuid">>(post.id),
  );
  TestValidator.equals("post type is text", post.type, "text");
  TestValidator.equals("post title matches", post.title, postData.title);
  TestValidator.predicate(
    "post has creation timestamp",
    typia.is<string & tags.Format<"date-time">>(post.created_at),
  );
  TestValidator.predicate(
    "post has update timestamp",
    typia.is<string & tags.Format<"date-time">>(post.updated_at),
  );
}

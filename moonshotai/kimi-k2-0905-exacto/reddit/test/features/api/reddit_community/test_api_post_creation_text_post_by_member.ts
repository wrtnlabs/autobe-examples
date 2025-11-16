import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test creating a new text post within a community by an authenticated member.
 * Validates the complete workflow from member authentication through community
 * identification and post content validation. The test ensures that text posts
 * with required title and content properties are properly created and
 * associated with the correct community, author, and post type classifications
 * within the Reddit Community platform.
 *
 * The test implements the following workflow:
 *
 * 1. Register a new member account to establish authentication
 * 2. Create a text post with appropriate title and content
 * 3. Validate the post creation response includes all expected properties
 * 4. Verify the post is associated with correct author information
 * 5. Ensure post type classification and counters are properly initialized
 */
export async function test_api_post_creation_text_post_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const nickname = RandomGenerator.name()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .substring(0, 21);

  const password = RandomGenerator.alphaNumeric(12) + "A1!"; // Secure password with mixed characters

  const memberRegistration = {
    email: memberEmail,
    nickname: nickname,
    password: password,
  } satisfies IRedditCommunityMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberRegistration,
  });
  typia.assert(authorizedMember);

  // Validate member registration was successful
  TestValidator.equals(
    "member email matches registration",
    authorizedMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "member nickname matches registration",
    authorizedMember.nickname,
    nickname,
  );

  // Step 2: Create a text post with appropriate content
  const postTitle = RandomGenerator.name(3).toUpperCase(); // Realistic title format
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 8,
  });

  // Generate random community and post type IDs for association
  const redditCommunityId = typia.random<string & tags.Format<"uuid">>();
  const redditPostTypeId = typia.random<string & tags.Format<"uuid">>();

  const postCreationData = {
    title: postTitle,
    content: postContent,
    reddit_community_id: redditCommunityId,
    reddit_post_type_id: redditPostTypeId,
  } satisfies IRedditCommunityPost.ICreate;

  const createdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postCreationData,
    },
  );
  typia.assert(createdPost);

  // Step 3: Validate post creation response structure
  TestValidator.equals(
    "post title matches input",
    createdPost.title,
    postTitle,
  );
  TestValidator.equals(
    "post content matches input",
    createdPost.content,
    postContent,
  );

  // Step 4: Verify post is associated with correct author information
  TestValidator.equals(
    "post author ID matches member ID",
    createdPost.author.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "post author email matches member email",
    createdPost.author.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "post author nickname matches member nickname",
    createdPost.author.nickname,
    authorizedMember.nickname,
  );

  // Step 5: Verify post type classification and community association
  TestValidator.equals(
    "post post_type ID matches input ID",
    createdPost.post_type.id,
    redditPostTypeId,
  );
  TestValidator.equals(
    "post community ID matches input community ID",
    createdPost.community.id,
    redditCommunityId,
  );

  // Step 6: Validate counter initialization
  TestValidator.predicate(
    "upvote count starts at zero",
    createdPost.upvote_count === 0,
  );
  TestValidator.predicate(
    "downvote count starts at zero",
    createdPost.downvote_count === 0,
  );
  TestValidator.predicate(
    "view count starts at zero",
    createdPost.view_count === 0,
  );
  TestValidator.predicate(
    "comment count starts at zero",
    createdPost.comment_count === 0,
  );

  // Step 7: Verify post state properties
  TestValidator.predicate(
    "post is not locked by default",
    createdPost.is_locked === false,
  );
  TestValidator.predicate(
    "post is not pinned by default",
    createdPost.is_pinned === false,
  );
}

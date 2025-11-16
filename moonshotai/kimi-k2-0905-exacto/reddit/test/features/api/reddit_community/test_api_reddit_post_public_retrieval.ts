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
 * Test retrieving a Reddit community post with all its details by post ID. This
 * scenario validates that any user (including visitors) can view post content
 * including title, content, voting statistics, author information, and
 * community details. The test ensures proper data transformation of the
 * complete post entity with upvote/downvote counts, view counts, comment
 * counts, moderation status (locked/pinned flags), and timestamps. Verifies
 * that community, author, and post type information are properly nested and
 * returned in the response.
 */
export async function test_api_reddit_post_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account for post creation
  const email = typia.random<string & tags.Format<"email">>();
  const nickname = RandomGenerator.name(3).replace(/\s+/g, "_").toLowerCase();
  const password = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email,
      nickname: nickname.substring(0, 21), // Ensure within max length
      password,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Login to get authentication context
  const loginRequest = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
      href: "https://reddit-community.test",
      referrer: "https://reddit-community.test/join",
      ip: "127.0.0.1",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });
  typia.assert(loginRequest);

  // Step 3: Create a comprehensive Reddit community post
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTypeId = typia.random<string & tags.Format<"uuid">>();
  const title = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const content = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
  });

  const createdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title,
        content,
        reddit_community_id: communityId,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(createdPost);

  // Step 4: Retrieve the post publicly - create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const retrievedPost = await api.functional.redditCommunity.posts.at(
    unauthConn,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(retrievedPost);

  // Step 5: Validate all post details are properly returned
  TestValidator.equals("post ID matches", retrievedPost.id, createdPost.id);
  TestValidator.equals("title matches", retrievedPost.title, createdPost.title);
  TestValidator.equals(
    "content matches",
    retrievedPost.content,
    createdPost.content,
  );

  // Validate engagement metrics and statistics
  TestValidator.equals(
    "upvote count",
    retrievedPost.upvote_count,
    createdPost.upvote_count,
  );
  TestValidator.equals(
    "downvote count",
    retrievedPost.downvote_count,
    createdPost.downvote_count,
  );
  TestValidator.equals(
    "view count",
    retrievedPost.view_count,
    createdPost.view_count,
  );
  TestValidator.equals(
    "comment count",
    retrievedPost.comment_count,
    createdPost.comment_count,
  );

  // Validate moderation status
  TestValidator.equals(
    "locked status",
    retrievedPost.is_locked,
    createdPost.is_locked,
  );
  TestValidator.equals(
    "pinned status",
    retrievedPost.is_pinned,
    createdPost.is_pinned,
  );

  // Validate timestamps follow ISO 8601 format
  TestValidator.predicate("created at is valid ISO date-time", () =>
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]/.test(
      retrievedPost.created_at,
    ),
  );
  TestValidator.predicate("updated at is valid ISO date-time", () =>
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]/.test(
      retrievedPost.updated_at,
    ),
  );

  // Validate nested community information
  TestValidator.predicate(
    "community is provided",
    () => typeof retrievedPost.community === "object",
  );
  TestValidator.equals(
    "community ID matches",
    retrievedPost.community.id,
    createdPost.community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    createdPost.community.name,
  );
  TestValidator.equals(
    "community title matches",
    retrievedPost.community.title,
    createdPost.community.title,
  );
  TestValidator.predicate(
    "community subscriber count is non-negative",
    () => retrievedPost.community.subscriber_count >= 0,
  );

  // Validate nested author information
  TestValidator.predicate(
    "author is provided",
    () => typeof retrievedPost.author === "object",
  );
  TestValidator.equals(
    "author ID matches",
    retrievedPost.author.id,
    createdPost.author.id,
  );
  TestValidator.equals(
    "author nickname matches",
    retrievedPost.author.nickname,
    createdPost.author.nickname,
  );
  TestValidator.equals(
    "author email matches",
    retrievedPost.author.email,
    createdPost.author.email,
  );

  // Validate nested post type information
  TestValidator.predicate(
    "post type is provided",
    () => typeof retrievedPost.post_type === "object",
  );
  TestValidator.equals(
    "post type ID matches",
    retrievedPost.post_type.id,
    createdPost.post_type.id,
  );
  TestValidator.equals(
    "post type name matches",
    retrievedPost.post_type.name,
    createdPost.post_type.name,
  );

  // Validate business logic constraints
  TestValidator.predicate(
    "status is valid public/community type",
    () =>
      retrievedPost.community.type === "public" ||
      retrievedPost.community.type === "restricted" ||
      retrievedPost.community.type === "private",
  );

  TestValidator.predicate("title follows community guidelines", () => {
    const maxTitleLength = 300;
    return retrievedPost.title.length <= maxTitleLength;
  });

  // Validate data types match expectations
  TestValidator.predicate("engagement counts are numbers", () => {
    return (
      !isNaN(retrievedPost.upvote_count) &&
      !isNaN(retrievedPost.downvote_count) &&
      !isNaN(retrievedPost.view_count) &&
      !isNaN(retrievedPost.comment_count)
    );
  });

  TestValidator.predicate("all vote counts are non-negative", () => {
    return (
      retrievedPost.upvote_count >= 0 &&
      retrievedPost.downvote_count >= 0 &&
      retrievedPost.view_count >= 0 &&
      retrievedPost.comment_count >= 0
    );
  });

  // Additional end-to-end validation for public accessibility
  TestValidator.predicate("public post can be accessed without auth", () => {
    // Since we retrieved with unauthenticated connection, this proves public access
    return typeof retrievedPost === "object" && retrievedPost !== null;
  });

  TestValidator.predicate("community category handling is graceful", () => {
    const category = retrievedPost.community.category;
    return (
      category === null ||
      (typeof category === "object" &&
        typeof category.id === "string" &&
        typeof category.name === "string")
    );
  });

  // Validate that public access protects private information
  TestValidator.predicate("no sensitive data exposed", () => {
    // Should not expose private member data beyond what's needed for public display
    return (
      !retrievedPost.author.hasOwnProperty("token") &&
      typeof retrievedPost.author.email === "string" && // email is acceptable for display
      typeof retrievedPost.author.created_at === "string"
    );
  });
}

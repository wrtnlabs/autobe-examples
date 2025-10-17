import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that unauthenticated guest users can publicly access comments on posts
 * in public communities without requiring login or registration.
 *
 * This test validates the open discussion model where guests can view comment
 * threads on public posts to promote content discovery. The test creates a post
 * with multiple comments (including nested replies) in a public community, then
 * verifies that an unauthenticated connection can successfully retrieve the
 * complete comment thread with all metadata.
 *
 * Steps:
 *
 * 1. Create authenticated member account
 * 2. Create public community
 * 3. Create post in the community
 * 4. Create multiple comments (top-level and nested)
 * 5. Create unauthenticated connection
 * 6. Retrieve comments without authentication
 * 7. Validate successful response with complete data
 */
export async function test_api_post_comments_public_access_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account for test data setup
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create public community to host the post
  const communityData = {
    code: RandomGenerator.alphabets(10).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 3: Create a text post in the public community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create multiple comments (top-level and nested)
  const topLevelComment1Data = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditLikeComment.ICreate;

  const topLevelComment1: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: topLevelComment1Data,
    });
  typia.assert(topLevelComment1);

  const topLevelComment2Data = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeComment.ICreate;

  const topLevelComment2: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: topLevelComment2Data,
    });
  typia.assert(topLevelComment2);

  // Create nested reply to first top-level comment
  const nestedReplyData = {
    reddit_like_post_id: post.id,
    reddit_like_parent_comment_id: topLevelComment1.id,
    content_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeComment.ICreate;

  const nestedReply: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: nestedReplyData,
    });
  typia.assert(nestedReply);

  // Step 5: Create unauthenticated connection (guest user)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 6: Retrieve comments without authentication
  const requestBody = {
    page: 1,
    limit: 50,
    sort_by: "new",
  } satisfies IRedditLikeComment.IRequest;

  const commentsPage: IPageIRedditLikeComment =
    await api.functional.redditLike.posts.comments.index(
      unauthenticatedConnection,
      {
        postId: post.id,
        body: requestBody,
      },
    );
  typia.assert(commentsPage);

  // Step 7: Validate successful response with complete comment data
  TestValidator.predicate(
    "comments page has pagination data",
    commentsPage.pagination !== null && commentsPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "comments data array exists",
    Array.isArray(commentsPage.data),
  );

  TestValidator.predicate(
    "at least 3 comments were created",
    commentsPage.data.length >= 3,
  );

  // Verify all created comments are present
  const commentIds = commentsPage.data.map((c) => c.id);
  TestValidator.predicate(
    "top-level comment 1 is present",
    commentIds.includes(topLevelComment1.id),
  );

  TestValidator.predicate(
    "top-level comment 2 is present",
    commentIds.includes(topLevelComment2.id),
  );

  TestValidator.predicate(
    "nested reply is present",
    commentIds.includes(nestedReply.id),
  );

  // Validate comment data structure
  commentsPage.data.forEach((comment) => {
    TestValidator.predicate(
      "comment has id",
      typeof comment.id === "string" && comment.id.length > 0,
    );

    TestValidator.predicate(
      "comment has post reference",
      comment.reddit_like_post_id === post.id,
    );

    TestValidator.predicate(
      "comment has content",
      typeof comment.content_text === "string" &&
        comment.content_text.length > 0,
    );

    TestValidator.predicate(
      "comment has vote score",
      typeof comment.vote_score === "number",
    );

    TestValidator.predicate(
      "comment has depth indicator",
      typeof comment.depth === "number" && comment.depth >= 0,
    );

    TestValidator.predicate(
      "comment has created timestamp",
      typeof comment.created_at === "string",
    );
  });

  // Verify nested comment has correct parent reference
  const retrievedNestedReply = commentsPage.data.find(
    (c) => c.id === nestedReply.id,
  );
  if (retrievedNestedReply) {
    TestValidator.equals(
      "nested reply has correct parent",
      retrievedNestedReply.reddit_like_parent_comment_id,
      topLevelComment1.id,
    );

    TestValidator.predicate(
      "nested reply has depth greater than 0",
      retrievedNestedReply.depth > 0,
    );
  }
}

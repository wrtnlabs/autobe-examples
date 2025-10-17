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
 * Test retrieving comments for a post using the 'best' sorting algorithm which
 * uses confidence-based scoring to balance vote score and controversy.
 *
 * This test validates the comment retrieval system with 'best' sorting that
 * promotes quality discussions by balancing vote scores with controversy
 * metrics.
 *
 * Test workflow:
 *
 * 1. Create a member account for authentication
 * 2. Create a community to host the post
 * 3. Create a post within the community
 * 4. Create multiple comments on the post
 * 5. Retrieve comments using 'best' sorting algorithm
 * 6. Validate pagination and ordering consistency
 * 7. Verify response includes vote scores, metadata, and threading information
 */
export async function test_api_post_comments_retrieval_with_best_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a community to host the post
  const communityData = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Step 3: Create a post within the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create multiple comments with varying characteristics
  const commentTexts = [
    RandomGenerator.paragraph({ sentences: 5 }),
    RandomGenerator.paragraph({ sentences: 4 }),
    RandomGenerator.paragraph({ sentences: 6 }),
    RandomGenerator.paragraph({ sentences: 3 }),
    RandomGenerator.paragraph({ sentences: 7 }),
  ];

  const createdComments: IRedditLikeComment[] = [];
  for (const text of commentTexts) {
    const commentData = {
      reddit_like_post_id: post.id,
      content_text: text,
    } satisfies IRedditLikeComment.ICreate;

    const comment: IRedditLikeComment =
      await api.functional.redditLike.member.posts.comments.create(connection, {
        postId: post.id,
        body: commentData,
      });
    typia.assert(comment);
    createdComments.push(comment);
  }

  // Step 5: Retrieve comments using 'best' sorting algorithm
  const retrievalRequest = {
    page: 1,
    limit: 10,
    sort_by: "best",
  } satisfies IRedditLikeComment.IRequest;

  const commentsPage: IPageIRedditLikeComment =
    await api.functional.redditLike.posts.comments.index(connection, {
      postId: post.id,
      body: retrievalRequest,
    });
  typia.assert(commentsPage);

  // Step 6: Validate pagination structure
  TestValidator.equals(
    "current page should be 1",
    commentsPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit should match request",
    commentsPage.pagination.limit,
    10,
  );

  // Step 7: Validate comments count
  TestValidator.equals(
    "should retrieve all created comments",
    commentsPage.data.length,
    createdComments.length,
  );

  // Step 8: Verify each comment structure and post association
  for (const comment of commentsPage.data) {
    typia.assert(comment);

    TestValidator.equals(
      "comment should belong to the correct post",
      comment.reddit_like_post_id,
      post.id,
    );
  }

  // Step 9: Test pagination with second page request
  const secondPageRequest = {
    page: 2,
    limit: 3,
    sort_by: "best",
  } satisfies IRedditLikeComment.IRequest;

  const secondPage: IPageIRedditLikeComment =
    await api.functional.redditLike.posts.comments.index(connection, {
      postId: post.id,
      body: secondPageRequest,
    });
  typia.assert(secondPage);

  TestValidator.equals(
    "second page current should be 2",
    secondPage.pagination.current,
    2,
  );

  TestValidator.equals(
    "second page limit should match request",
    secondPage.pagination.limit,
    3,
  );

  // Step 10: Validate consistent ordering across pages
  const firstPageIds = commentsPage.data.slice(0, 3).map((c) => c.id);
  const secondPageIds = secondPage.data.map((c) => c.id);

  for (const id of secondPageIds) {
    TestValidator.predicate(
      "second page should not contain first page items",
      !firstPageIds.includes(id),
    );
  }
}

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
 * Test pagination functionality for comment replies in a large thread.
 *
 * This test validates that the pagination system correctly handles retrieval of
 * replies from a parent comment with 50+ nested replies, simulating a popular
 * discussion thread. It verifies pagination controls (page size limits, page
 * navigation), total count accuracy, consistent ordering across pages, and
 * ensures no duplicates or missing replies across page boundaries.
 *
 * Steps:
 *
 * 1. Register and authenticate a member
 * 2. Create a community for the discussion
 * 3. Create a post within the community
 * 4. Create a parent comment on the post
 * 5. Create 50+ replies to the parent comment
 * 6. Test pagination with different parameters
 * 7. Validate pagination correctness and data integrity
 */
export async function test_api_comment_replies_pagination_large_thread(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create a community
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: communityData,
    },
  );
  typia.assert(community);

  // Step 3: Create a post within the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: postData,
  });
  typia.assert(post);

  // Step 4: Create a parent comment
  const parentCommentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeComment.ICreate;

  const parentComment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: parentCommentData,
    },
  );
  typia.assert(parentComment);

  // Step 5: Create 50+ replies to the parent comment
  const replyCount = 55;
  const createdReplies: IRedditLikeComment[] = [];

  for (let i = 0; i < replyCount; i++) {
    const replyData = {
      reddit_like_post_id: post.id,
      reddit_like_parent_comment_id: parentComment.id,
      content_text: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IRedditLikeComment.ICreate;

    const reply = await api.functional.redditLike.member.comments.create(
      connection,
      {
        body: replyData,
      },
    );
    typia.assert(reply);
    createdReplies.push(reply);
  }

  // Step 6: Test pagination with page size of 10
  const pageSize = 10;
  const firstPageRequest = {
    page: 1,
    limit: pageSize,
  } satisfies IRedditLikeComment.IReplyRequest;

  const firstPage = await api.functional.redditLike.comments.replies.index(
    connection,
    {
      commentId: parentComment.id,
      body: firstPageRequest,
    },
  );
  typia.assert(firstPage);

  // Step 7: Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "total records should match created replies",
    firstPage.pagination.records,
    replyCount,
  );

  const expectedPages = Math.ceil(replyCount / pageSize);
  TestValidator.equals(
    "total pages should be calculated correctly",
    firstPage.pagination.pages,
    expectedPages,
  );

  // Step 8: Validate first page data
  TestValidator.equals(
    "first page should contain exactly page size items",
    firstPage.data.length,
    pageSize,
  );

  // Step 9: Retrieve all pages and collect all replies
  const allRetrievedReplies: IRedditLikeComment.ISummary[] = [
    ...firstPage.data,
  ];

  for (let pageNum = 2; pageNum <= expectedPages; pageNum++) {
    const pageRequest = {
      page: pageNum,
      limit: pageSize,
    } satisfies IRedditLikeComment.IReplyRequest;

    const pageResult = await api.functional.redditLike.comments.replies.index(
      connection,
      {
        commentId: parentComment.id,
        body: pageRequest,
      },
    );
    typia.assert(pageResult);

    TestValidator.equals(
      "page number should match request",
      pageResult.pagination.current,
      pageNum,
    );

    allRetrievedReplies.push(...pageResult.data);
  }

  // Step 10: Validate no duplicates across pages
  const replyIds = allRetrievedReplies.map((r) => r.id);
  const uniqueReplyIds = new Set(replyIds);
  TestValidator.equals(
    "no duplicate replies across pages",
    uniqueReplyIds.size,
    replyIds.length,
  );

  // Step 11: Validate total count matches
  TestValidator.equals(
    "all replies retrieved across pages",
    allRetrievedReplies.length,
    replyCount,
  );

  // Step 12: Validate all created replies are present
  const retrievedIdSet = new Set(replyIds);
  const allCreatedPresent = createdReplies.every((reply) =>
    retrievedIdSet.has(reply.id),
  );
  TestValidator.predicate(
    "all created replies are present in paginated results",
    allCreatedPresent,
  );

  // Step 13: Test different page sizes
  const largeLimitRequest = {
    page: 1,
    limit: 100,
  } satisfies IRedditLikeComment.IReplyRequest;

  const largeLimitPage = await api.functional.redditLike.comments.replies.index(
    connection,
    {
      commentId: parentComment.id,
      body: largeLimitRequest,
    },
  );
  typia.assert(largeLimitPage);

  TestValidator.predicate(
    "large page size returns all replies in single page",
    largeLimitPage.data.length === replyCount,
  );

  // Step 14: Test small page size
  const smallLimitRequest = {
    page: 1,
    limit: 5,
  } satisfies IRedditLikeComment.IReplyRequest;

  const smallLimitPage = await api.functional.redditLike.comments.replies.index(
    connection,
    {
      commentId: parentComment.id,
      body: smallLimitRequest,
    },
  );
  typia.assert(smallLimitPage);

  TestValidator.equals(
    "small page size respects limit",
    smallLimitPage.data.length,
    5,
  );
  TestValidator.equals(
    "small page size calculates correct total pages",
    smallLimitPage.pagination.pages,
    Math.ceil(replyCount / 5),
  );
}

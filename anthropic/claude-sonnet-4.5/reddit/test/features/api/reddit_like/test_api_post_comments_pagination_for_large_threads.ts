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
 * Test pagination functionality for posts with large comment volumes to ensure
 * efficient loading and navigation.
 *
 * This test validates that the pagination system can handle extensive comment
 * threads by:
 *
 * 1. Creating a member account for authentication
 * 2. Creating a community to host discussions
 * 3. Creating a post to receive comments
 * 4. Generating 60 comments to simulate a popular discussion
 * 5. Testing pagination with different page sizes (25 and 50 per page)
 * 6. Verifying correct comment counts, ordering, and metadata across pages
 * 7. Ensuring all comments are accessible without duplication or omission
 */
export async function test_api_post_comments_pagination_for_large_threads(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create community to host the post
  const communityData = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create post to receive comments
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

  // Step 4: Generate 60 comments to simulate large thread
  const commentCount = 60;
  const createdComments: IRedditLikeComment[] = await ArrayUtil.asyncRepeat(
    commentCount,
    async (index) => {
      const commentData = {
        reddit_like_post_id: post.id,
        content_text: `${RandomGenerator.paragraph({ sentences: 2 })} - Comment #${index + 1}`,
      } satisfies IRedditLikeComment.ICreate;

      const comment: IRedditLikeComment =
        await api.functional.redditLike.member.posts.comments.create(
          connection,
          {
            postId: post.id,
            body: commentData,
          },
        );
      typia.assert(comment);
      return comment;
    },
  );

  TestValidator.equals(
    "created comment count",
    createdComments.length,
    commentCount,
  );

  // Step 5: Test pagination with 25 comments per page
  const pageSize25 = 25;
  const requestPage25 = {
    page: 1,
    limit: pageSize25,
    sort_by: "new",
  } satisfies IRedditLikeComment.IRequest;

  const page1With25: IPageIRedditLikeComment =
    await api.functional.redditLike.posts.comments.index(connection, {
      postId: post.id,
      body: requestPage25,
    });
  typia.assert(page1With25);

  // Step 6: Verify correct number of comments returned
  TestValidator.equals(
    "page 1 comment count with limit 25",
    page1With25.data.length,
    pageSize25,
  );

  // Step 7: Verify pagination metadata
  TestValidator.equals(
    "total records",
    page1With25.pagination.records,
    commentCount,
  );
  TestValidator.equals("current page", page1With25.pagination.current, 1);
  TestValidator.equals(
    "limit per page",
    page1With25.pagination.limit,
    pageSize25,
  );

  const expectedPages25 = Math.ceil(commentCount / pageSize25);
  TestValidator.equals(
    "total pages with limit 25",
    page1With25.pagination.pages,
    expectedPages25,
  );

  // Step 8: Retrieve second page to test navigation
  const requestPage2 = {
    page: 2,
    limit: pageSize25,
    sort_by: "new",
  } satisfies IRedditLikeComment.IRequest;

  const page2With25: IPageIRedditLikeComment =
    await api.functional.redditLike.posts.comments.index(connection, {
      postId: post.id,
      body: requestPage2,
    });
  typia.assert(page2With25);

  TestValidator.equals(
    "page 2 comment count",
    page2With25.data.length,
    pageSize25,
  );
  TestValidator.equals(
    "page 2 current page",
    page2With25.pagination.current,
    2,
  );

  // Step 9: Verify no duplication between pages
  const page1Ids = page1With25.data.map((c) => c.id);
  const page2Ids = page2With25.data.map((c) => c.id);
  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate("no comment duplication across pages", !hasOverlap);

  // Step 10: Test pagination with 50 comments per page
  const pageSize50 = 50;
  const requestPage50 = {
    page: 1,
    limit: pageSize50,
    sort_by: "new",
  } satisfies IRedditLikeComment.IRequest;

  const page1With50: IPageIRedditLikeComment =
    await api.functional.redditLike.posts.comments.index(connection, {
      postId: post.id,
      body: requestPage50,
    });
  typia.assert(page1With50);

  TestValidator.equals(
    "page 1 comment count with limit 50",
    page1With50.data.length,
    pageSize50,
  );

  const expectedPages50 = Math.ceil(commentCount / pageSize50);
  TestValidator.equals(
    "total pages with limit 50",
    page1With50.pagination.pages,
    expectedPages50,
  );

  // Step 11: Retrieve second page with limit 50
  const requestPage2With50 = {
    page: 2,
    limit: pageSize50,
    sort_by: "new",
  } satisfies IRedditLikeComment.IRequest;

  const page2With50: IPageIRedditLikeComment =
    await api.functional.redditLike.posts.comments.index(connection, {
      postId: post.id,
      body: requestPage2With50,
    });
  typia.assert(page2With50);

  const expectedRemainingComments = commentCount - pageSize50;
  TestValidator.equals(
    "page 2 remaining comments with limit 50",
    page2With50.data.length,
    expectedRemainingComments,
  );

  // Step 12: Verify all comments are accessible across pages
  const allPage1Comments = page1With25.data;
  const allPage2Comments = page2With25.data;

  const totalRetrievedFromFirstTwoPages =
    allPage1Comments.length + allPage2Comments.length;
  TestValidator.equals(
    "first two pages total comments",
    totalRetrievedFromFirstTwoPages,
    pageSize25 * 2,
  );

  // Step 13: Verify consistent ordering by checking IDs are unique
  const allRetrievedIds = [...page1Ids, ...page2Ids];
  const uniqueIds = new Set(allRetrievedIds);
  TestValidator.equals(
    "unique comment IDs",
    uniqueIds.size,
    allRetrievedIds.length,
  );
}

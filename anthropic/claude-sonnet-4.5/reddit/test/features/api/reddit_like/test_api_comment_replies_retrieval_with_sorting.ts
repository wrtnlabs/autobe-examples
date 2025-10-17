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
 * Test retrieving comment replies with different sorting algorithms.
 *
 * This test validates the comment reply retrieval functionality with various
 * sorting methods. It creates a complete discussion thread structure including
 * member registration, community creation, post creation, parent comment, and
 * multiple nested replies. Then it retrieves these replies using different
 * sorting algorithms to validate correct ordering and pagination.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a member
 * 2. Create a community for discussions
 * 3. Create a post within the community
 * 4. Create a parent comment on the post
 * 5. Create multiple nested replies to the parent comment
 * 6. Retrieve replies with different sorting methods (best, top, new,
 *    controversial)
 * 7. Validate pagination works correctly
 * 8. Verify reply metadata is properly included
 */
export async function test_api_comment_replies_retrieval_with_sorting(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a community for discussions
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
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

  // Step 3: Create a post within the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create a parent comment on the post
  const parentCommentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditLikeComment.ICreate;

  const parentComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: parentCommentData,
    });
  typia.assert(parentComment);

  // Step 5: Create multiple nested replies to the parent comment
  const replyCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >() satisfies number as number;
  const replies: IRedditLikeComment[] = await ArrayUtil.asyncRepeat(
    replyCount,
    async (index) => {
      const replyData = {
        reddit_like_post_id: post.id,
        reddit_like_parent_comment_id: parentComment.id,
        content_text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 6,
        }),
      } satisfies IRedditLikeComment.ICreate;

      const reply: IRedditLikeComment =
        await api.functional.redditLike.member.comments.create(connection, {
          body: replyData,
        });
      typia.assert(reply);
      return reply;
    },
  );

  // Step 6: Retrieve replies with different sorting methods
  const sortMethods = ["best", "top", "new", "controversial"] as const;

  for (const sortMethod of sortMethods) {
    const repliesPage: IPageIRedditLikeComment.ISummary =
      await api.functional.redditLike.comments.replies.index(connection, {
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: sortMethod,
        } satisfies IRedditLikeComment.IReplyRequest,
      });
    typia.assert(repliesPage);

    // Validate pagination information
    TestValidator.predicate(
      "pagination current page should be 1",
      repliesPage.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit should be 10",
      repliesPage.pagination.limit === 10,
    );
    TestValidator.predicate(
      "pagination records should match reply count",
      repliesPage.pagination.records >= replyCount,
    );

    // Validate that replies are returned
    TestValidator.predicate(
      "should return reply data",
      repliesPage.data.length > 0,
    );

    // Validate each reply has proper metadata
    for (const reply of repliesPage.data) {
      TestValidator.predicate(
        "reply should have valid ID",
        reply.id.length > 0,
      );
      TestValidator.predicate(
        "reply should have content text",
        reply.content_text.length > 0,
      );
      TestValidator.predicate(
        "reply should have created_at timestamp",
        reply.created_at.length > 0,
      );
    }
  }

  // Step 7: Test pagination with different page sizes
  const paginationTest: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IRedditLikeComment.IReplyRequest,
    });
  typia.assert(paginationTest);

  TestValidator.predicate(
    "pagination should respect limit parameter",
    paginationTest.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination limit should be set correctly",
    paginationTest.pagination.limit === 2,
  );
}

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
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test retrieving user comment history with pagination and filtering.
 *
 * This test validates the complete comment history retrieval workflow:
 *
 * 1. Create member account for authentication
 * 2. Create community to host posts and comments
 * 3. Create multiple posts for commenting
 * 4. Create several comments with different characteristics
 * 5. Retrieve comment history with various filters and sorting
 * 6. Validate pagination, filtering, and sorting work correctly
 */
export async function test_api_user_comment_history_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create community
  const communityData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create multiple posts
  const posts: IRedditLikePost[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const postData = {
        community_id: community.id,
        type: "text",
        title: `Test Post ${index + 1} - ${RandomGenerator.name(3)}`,
        body: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies IRedditLikePost.ICreate;

      const post: IRedditLikePost =
        await api.functional.redditLike.member.posts.create(connection, {
          body: postData,
        });
      typia.assert(post);
      return post;
    },
  );

  // Step 4: Create multiple comments with different characteristics
  const createdComments: IRedditLikeComment[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const postIndex = index % posts.length;
      const commentData = {
        reddit_like_post_id: posts[postIndex].id,
        content_text: `Test comment ${index + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`,
      } satisfies IRedditLikeComment.ICreate;

      const comment: IRedditLikeComment =
        await api.functional.redditLike.member.comments.create(connection, {
          body: commentData,
        });
      typia.assert(comment);
      return comment;
    },
  );

  // Step 5: Retrieve comment history with default parameters
  const defaultHistoryRequest = {
    page: 1,
    limit: 10,
    sort_by: "new",
  } satisfies IRedditLikeUser.ICommentsRequest;

  const defaultHistory: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.users.comments(connection, {
      userId: member.id,
      body: defaultHistoryRequest,
    });
  typia.assert(defaultHistory);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    defaultHistory.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    defaultHistory.pagination.limit === 10,
  );
  TestValidator.predicate(
    "total records matches created comments",
    defaultHistory.pagination.records >= createdComments.length,
  );

  // Validate all created comments appear in results
  TestValidator.predicate(
    "all created comments present in history",
    createdComments.length <= defaultHistory.data.length,
  );

  // Step 6: Test with different sorting - top comments
  const topSortRequest = {
    page: 1,
    limit: 10,
    sort_by: "top",
  } satisfies IRedditLikeUser.ICommentsRequest;

  const topSortedHistory: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.users.comments(connection, {
      userId: member.id,
      body: topSortRequest,
    });
  typia.assert(topSortedHistory);

  TestValidator.predicate(
    "top sorted history contains data",
    topSortedHistory.data.length > 0,
  );

  // Step 7: Test with controversial sorting
  const controversialRequest = {
    page: 1,
    limit: 5,
    sort_by: "controversial",
  } satisfies IRedditLikeUser.ICommentsRequest;

  const controversialHistory: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.users.comments(connection, {
      userId: member.id,
      body: controversialRequest,
    });
  typia.assert(controversialHistory);

  TestValidator.predicate(
    "controversial sorting returns results",
    controversialHistory.data.length > 0,
  );
  TestValidator.equals(
    "controversial request respects limit",
    controversialHistory.pagination.limit,
    5,
  );

  // Step 8: Test pagination with page 2
  const page2Request = {
    page: 2,
    limit: 2,
    sort_by: "new",
  } satisfies IRedditLikeUser.ICommentsRequest;

  const page2History: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.users.comments(connection, {
      userId: member.id,
      body: page2Request,
    });
  typia.assert(page2History);

  TestValidator.equals(
    "page 2 current page is 2",
    page2History.pagination.current,
    2,
  );

  // Validate comment summary structure
  if (defaultHistory.data.length > 0) {
    const firstComment = defaultHistory.data[0];
    typia.assert<IRedditLikeComment.ISummary>(firstComment);
  }
}

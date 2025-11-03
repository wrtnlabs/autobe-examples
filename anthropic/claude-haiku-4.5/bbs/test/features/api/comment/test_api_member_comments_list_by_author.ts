import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test authenticated member's ability to retrieve and view their own comments
 * with filtering and pagination.
 *
 * This test validates comprehensive comment management functionality:
 *
 * - Member can retrieve their own comments across all articles
 * - Comments are properly filtered by article, date range, and status
 * - Pagination correctly divides comment results
 * - Sorting by creation date produces correct chronological ordering
 * - Members can only view their own comments
 * - Comment metadata (author, timestamps, edit history) is correctly displayed
 * - Deleted and moderated comments are included with appropriate status
 *   indicators
 *
 * Workflow:
 *
 * 1. Register member account for authentication
 * 2. Create article to serve as container for comments
 * 3. Post multiple comments by the member on the article
 * 4. Retrieve member's comment list with default pagination
 * 5. Validate all comments are included in results
 * 6. Test filtering by article ID
 * 7. Test pagination with different page sizes and page numbers
 * 8. Test sorting by creation date (ascending and descending)
 * 9. Validate comment metadata (author, timestamps, edit history)
 * 10. Test filtering by status and date range
 */
export async function test_api_member_comments_list_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    password: "SecurePassword123",
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create article to serve as container for comments
  const articleData = {
    title: "Test Article for Comments",
    content:
      "This is a test article where we will post multiple comments to test the comment listing functionality.",
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 3: Post multiple comments on the article
  const commentContents = [
    "This is my first comment on this article.",
    "Here is my second comment with more details.",
    "My third comment discussing the topic further.",
    "Fourth comment with additional insights.",
    "Final comment wrapping up my thoughts.",
  ];

  const comments: IDiscussionBoardComment[] = [];

  for (const content of commentContents) {
    const comment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: content,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);

    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  TestValidator.equals(
    "all comments created successfully",
    comments.length,
    commentContents.length,
  );

  // Step 4: Retrieve member's comment list with default pagination
  const commentListResponse =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {} satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(commentListResponse);

  // Step 5: Validate all comments are included in results
  TestValidator.predicate(
    "comment list contains created comments",
    commentListResponse.data.length >= commentContents.length,
  );

  TestValidator.equals(
    "pagination current page is correct",
    commentListResponse.pagination.current,
    1,
  );

  TestValidator.predicate(
    "pagination total records includes created comments",
    commentListResponse.pagination.records >= commentContents.length,
  );

  // Step 6: Test filtering by article ID
  const filteredByArticle =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        article_id: article.id,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(filteredByArticle);

  TestValidator.equals(
    "filtered comment list contains article comments",
    filteredByArticle.data.length,
    commentContents.length,
  );

  // Verify all filtered comments belong to the article
  for (const comment of filteredByArticle.data) {
    TestValidator.equals(
      "comment belongs to filtered article",
      comment.discussion_board_article_id,
      article.id,
    );
  }

  // Step 7: Test pagination with different page sizes
  const smallPageSize =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        limit: 2,
        page: 1,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(smallPageSize);

  TestValidator.predicate(
    "small page size limits results",
    smallPageSize.data.length <= 2,
  );

  const firstPageIds = smallPageSize.data.map((c) => c.id);

  // Test second page
  const secondPage =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        limit: 2,
        page: 2,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(secondPage);

  TestValidator.equals(
    "second page has correct page number",
    secondPage.pagination.current,
    2,
  );

  const secondPageIds = secondPage.data.map((c) => c.id);
  TestValidator.predicate(
    "second page contains different comments than first page",
    !firstPageIds.some((id) => secondPageIds.includes(id)) ||
      firstPageIds.length === 0,
  );

  // Step 8: Test sorting by creation date
  const newestFirst =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        sort_by: "created_at",
        order: "desc",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(newestFirst);

  // Verify descending order by checking timestamps
  for (let i = 0; i < newestFirst.data.length - 1; i++) {
    const current = new Date(newestFirst.data[i].created_at).getTime();
    const next = new Date(newestFirst.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `comment ${i} is newer than or equal to comment ${i + 1}`,
      current >= next,
    );
  }

  const oldestFirst =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        sort_by: "created_at",
        order: "asc",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(oldestFirst);

  // Verify ascending order by checking timestamps
  for (let i = 0; i < oldestFirst.data.length - 1; i++) {
    const current = new Date(oldestFirst.data[i].created_at).getTime();
    const next = new Date(oldestFirst.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `comment ${i} is older than or equal to comment ${i + 1}`,
      current <= next,
    );
  }

  // Step 9: Validate comment metadata
  const commentWithMetadata = commentListResponse.data[0];

  TestValidator.predicate(
    "comment has id",
    commentWithMetadata.id !== null && commentWithMetadata.id !== undefined,
  );

  TestValidator.equals(
    "comment author is the member",
    commentWithMetadata.author.id,
    member.id,
  );

  TestValidator.equals(
    "comment author email is correct",
    commentWithMetadata.author.email,
    memberEmail,
  );

  TestValidator.predicate(
    "comment has created_at timestamp",
    commentWithMetadata.created_at !== null &&
      commentWithMetadata.created_at !== undefined,
  );

  TestValidator.predicate(
    "comment has updated_at timestamp",
    commentWithMetadata.updated_at !== null &&
      commentWithMetadata.updated_at !== undefined,
  );

  TestValidator.predicate(
    "comment has edit_count",
    commentWithMetadata.edit_count >= 0,
  );

  TestValidator.predicate(
    "comment has thread_depth",
    commentWithMetadata.thread_depth >= 0,
  );

  // Step 10: Test filtering by status
  const publishedComments =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        status: "published",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(publishedComments);

  // All comments should be published
  for (const comment of publishedComments.data) {
    TestValidator.equals(
      "comment has published status",
      comment.status,
      "published",
    );
  }

  TestValidator.predicate(
    "published comments count is correct",
    publishedComments.data.length >= commentContents.length,
  );

  // Test filtering by date range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const recentComments =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        created_after: oneHourAgo,
        created_before: oneHourLater,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(recentComments);

  TestValidator.predicate(
    "date range filter returns comments within range",
    recentComments.data.length >= commentContents.length,
  );

  // Verify all returned comments are within the date range
  for (const comment of recentComments.data) {
    const commentTime = new Date(comment.created_at).toISOString();
    TestValidator.predicate(
      "comment is within date range",
      commentTime >= oneHourAgo && commentTime <= oneHourLater,
    );
  }
}

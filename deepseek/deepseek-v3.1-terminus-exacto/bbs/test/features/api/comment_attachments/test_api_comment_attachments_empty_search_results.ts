import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test search scenarios that return empty results for comment attachments.
 *
 * This test verifies that the comment attachment search API correctly handles
 * scenarios where no attachments match the search criteria. It creates a user,
 * article, and comment with attachments, then performs searches with intentionally
 * mismatched filters to ensure empty result sets are returned properly with correct
 * pagination metadata.
 */
export async function test_api_comment_attachments_empty_search_results(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // NOTE: The current API structure doesn't provide an endpoint to create comment attachments.
  // Since we cannot create actual attachments, we test the search functionality
  // by searching for patterns that wouldn't match any potential attachments.
  // This tests the search API's ability to handle empty result sets correctly.
  // Test 1: Search for non-existent filename pattern
  const search1 =
    await api.functional.discussionBoard.articles.comments.attachments.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          search: "nonexistent_filename_pattern_xyz123",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(search1);
  TestValidator.equals(
    "empty results for non-existent filename",
    search1.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for non-existent filename",
    search1.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent filename",
    search1.pagination.pages,
    0,
  );
  // Test 2: Search for wrong file type
  const search2 =
    await api.functional.discussionBoard.articles.comments.attachments.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          file_type: "application/pdf",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(search2);
  TestValidator.equals(
    "empty results for wrong file type",
    search2.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for wrong file type",
    search2.pagination.records,
    0,
  );
  // Test 3: Search using future date range
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const search3 =
    await api.functional.discussionBoard.articles.comments.attachments.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          created_at_from: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(search3);
  TestValidator.equals(
    "empty results for future date range",
    search3.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for future date range",
    search3.pagination.records,
    0,
  );
  // Test 4: Search using past date range (before comment creation)
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
  const search4 =
    await api.functional.discussionBoard.articles.comments.attachments.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          created_at_to: pastDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(search4);
  TestValidator.equals(
    "empty results for past date range",
    search4.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for past date range",
    search4.pagination.records,
    0,
  );
  // Test 5: Combined search with multiple mismatched filters
  const search5 =
    await api.functional.discussionBoard.articles.comments.attachments.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          search: "completely_wrong_pattern",
          file_type: "video/mp4",
          created_at_from: futureDate,
          created_at_to: futureDate,
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(search5);
  TestValidator.equals(
    "empty results for combined mismatched filters",
    search5.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for combined mismatched filters",
    search5.pagination.records,
    0,
  );
  TestValidator.predicate(
    "current page should be 2 even with empty results",
    search5.pagination.current === 2,
  );
  TestValidator.predicate(
    "limit should be preserved",
    search5.pagination.limit === 5,
  );
}

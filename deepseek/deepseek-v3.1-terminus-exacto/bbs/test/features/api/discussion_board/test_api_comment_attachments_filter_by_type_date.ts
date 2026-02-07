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

export async function test_api_comment_attachments_filter_by_type_date(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Note: We cannot create attachments as the attachment creation endpoint is not provided
  // The test will focus on testing the filtering functionality with the existing API structure
  // Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
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
  // Test filtering by file type (empty result set expected)
  const fileTypeFilter =
    await api.functional.discussionBoard.articles.comments.attachments.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          file_type: "image/jpeg",
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(fileTypeFilter);
  TestValidator.equals(
    "empty result set for non-existent file type",
    fileTypeFilter.data.length,
    0,
  );
  // Test filtering by date range (empty result set expected)
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateFilter =
    await api.functional.discussionBoard.articles.comments.attachments.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          created_at_from: yesterday,
          created_at_to: now,
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(dateFilter);
  TestValidator.equals(
    "empty result set for date range",
    dateFilter.data.length,
    0,
  );
  // Test pagination with empty results
  const paginationTest =
    await api.functional.discussionBoard.articles.comments.attachments.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination object exists",
    paginationTest.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    paginationTest.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", paginationTest.pagination.limit, 10);
  TestValidator.equals(
    "records count is 0",
    paginationTest.pagination.records,
    0,
  );
  TestValidator.equals("pages count is 0", paginationTest.pagination.pages, 0);
  // Test search functionality with empty results
  const searchTest =
    await api.functional.discussionBoard.articles.comments.attachments.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          search: "test",
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(searchTest);
  TestValidator.equals("empty search results", searchTest.data.length, 0);
  // Test combined filters
  const combinedFilter =
    await api.functional.discussionBoard.articles.comments.attachments.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          file_type: "image/png",
          created_at_from: yesterday,
          created_at_to: now,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "empty combined filter results",
    combinedFilter.data.length,
    0,
  );
}

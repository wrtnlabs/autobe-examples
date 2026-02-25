import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test retrieving paginated comments for an article with multiple existing comments.
 * Validates chronological ordering, pagination metadata, and comment field structure.
 */
export async function test_api_article_comments_pagination_order(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // Create an article for testing comments
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // Retrieve comments for the article (first page with default pagination)
  const commentsPage =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {} satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(commentsPage);
  // Validate pagination metadata structure and defaults
  TestValidator.equals(
    "default limit is 20",
    commentsPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default current page is 1",
    commentsPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    commentsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    commentsPage.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(commentsPage.data));
  // If there are comments, validate chronological ordering (oldest first)
  if (commentsPage.data.length > 1) {
    for (let i = 0; i < commentsPage.data.length - 1; i++) {
      const currentCreatedAt = new Date(
        commentsPage.data[i].created_at,
      ).getTime();
      const nextCreatedAt = new Date(
        commentsPage.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "comments are in chronological order (oldest first)",
        currentCreatedAt <= nextCreatedAt,
      );
    }
  }
  // Test pagination - if there are multiple pages, fetch second page
  if (commentsPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.discussionBoard.articles.comments.index(connection, {
        articleId: article.id,
        body: { page: 2 } satisfies IDiscussionBoardComment.IRequest,
      });
    typia.assert(secondPage);
    // Validate second page metadata
    TestValidator.equals(
      "second page current is 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page has same limit",
      secondPage.pagination.limit,
      commentsPage.pagination.limit,
    );
    TestValidator.equals(
      "second page has same total records",
      secondPage.pagination.records,
      commentsPage.pagination.records,
    );
    TestValidator.equals(
      "second page has same total pages",
      secondPage.pagination.pages,
      commentsPage.pagination.pages,
    );
    // Validate second page comments ordering
    if (secondPage.data.length > 1) {
      for (let i = 0; i < secondPage.data.length - 1; i++) {
        const currentCreatedAt = new Date(
          secondPage.data[i].created_at,
        ).getTime();
        const nextCreatedAt = new Date(
          secondPage.data[i + 1].created_at,
        ).getTime();
        TestValidator.predicate(
          "second page comments are in chronological order",
          currentCreatedAt <= nextCreatedAt,
        );
      }
    }
    // Validate continuity between pages
    if (commentsPage.data.length > 0 && secondPage.data.length > 0) {
      const lastCommentFirstPage = new Date(
        commentsPage.data[commentsPage.data.length - 1].created_at,
      ).getTime();
      const firstCommentSecondPage = new Date(
        secondPage.data[0].created_at,
      ).getTime();
      TestValidator.predicate(
        "pages maintain chronological continuity",
        lastCommentFirstPage <= firstCommentSecondPage,
      );
    }
  }
  // Test custom limit parameter
  const customLimitPage =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: { limit: 5 } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(customLimitPage);
  TestValidator.equals(
    "custom limit is respected",
    customLimitPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data does not exceed limit",
    customLimitPage.data.length <= 5,
  );
}

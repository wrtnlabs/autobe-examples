import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentEditHistory";
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

export async function test_api_comment_edit_history_pagination_with_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create article for comment context
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create initial comment
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
  // Since there's no comment editing endpoint available in the provided API functions,
  // we'll test the pagination functionality with the existing edit history data
  // (which may be minimal or empty, but will still validate the pagination logic)
  // Get current timestamp for date filtering
  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  // Test pagination with date filtering
  const pageSize = 5;
  // First, get the total count of edit histories
  const initialResponse =
    await api.functional.discussionBoard.articles.comments.edit_histories.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          created_at_start: startDate.toISOString(),
          created_at_end: endDate.toISOString(),
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1> as number,
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(initialResponse);
  const totalRecords = initialResponse.pagination.records;
  const totalPages = Math.ceil(totalRecords / pageSize);
  // Test pagination across available pages
  for (let page = 1; page <= totalPages; page++) {
    const searchResponse =
      await api.functional.discussionBoard.articles.comments.edit_histories.index(
        userConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            created_at_start: startDate.toISOString(),
            created_at_end: endDate.toISOString(),
            page: page satisfies number &
              tags.Type<"int32"> &
              tags.Default<1> &
              tags.Minimum<1> as number,
            limit: pageSize satisfies number &
              tags.Type<"int32"> &
              tags.Default<20> &
              tags.Minimum<1> &
              tags.Maximum<100> as number,
          } satisfies IDiscussionBoardCommentEditHistory.IRequest,
        },
      );
    typia.assert(searchResponse);
    // Validate pagination metadata
    TestValidator.equals(
      `page ${page} current page number`,
      searchResponse.pagination.current,
      page,
    );
    TestValidator.equals(
      `page ${page} page size`,
      searchResponse.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      `page ${page} total records`,
      searchResponse.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      `page ${page} total pages`,
      searchResponse.pagination.pages,
      totalPages,
    );
    // Validate data array size
    const expectedItemsOnPage =
      page === totalPages ? totalRecords % pageSize || pageSize : pageSize;
    if (totalRecords > 0) {
      TestValidator.equals(
        `page ${page} data count`,
        searchResponse.data.length,
        expectedItemsOnPage,
      );
    }
    // Validate edit sequence order if there are records
    if (searchResponse.data.length > 0) {
      for (let i = 0; i < searchResponse.data.length - 1; i++) {
        TestValidator.predicate(
          `page ${page} edit sequences in order`,
          searchResponse.data[i].edit_sequence <
            searchResponse.data[i + 1].edit_sequence,
        );
      }
    }
  }
  // Test date filtering with specific range that should return no results
  const farPastStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const farPastEnd = new Date(now.getTime() - 364 * 24 * 60 * 60 * 1000); // 364 days ago
  const filteredResponse =
    await api.functional.discussionBoard.articles.comments.edit_histories.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          created_at_start: farPastStart.toISOString(),
          created_at_end: farPastEnd.toISOString(),
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1> as number,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // The filtered range should return empty since edits are recent
  TestValidator.equals(
    "date filtered results count",
    filteredResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "date filtered data array empty",
    filteredResponse.data.length,
    0,
  );
}

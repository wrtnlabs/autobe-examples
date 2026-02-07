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

/**
 * Test searching comment edit histories with various filtering parameters
 * to validate filtering capabilities work correctly.
 */
export async function test_api_comment_edit_history_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user account
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
  // Create article as prerequisite for comment creation
  // Note: section_id must be a valid existing section UUID
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create initial comment
  const initialComment =
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
  typia.assert(initialComment);
  // Edit comment multiple times to generate edit history
  const editContents = ArrayUtil.repeat(5, (index) =>
    RandomGenerator.paragraph({ sentences: 2 }),
  );
  let currentComment = initialComment;
  for (const content of editContents) {
    const updatedComment =
      await api.functional.discussionBoard.user.articles.comments.update(
        userConnection,
        {
          articleId: article.id,
          commentId: currentComment.id,
          body: {
            content: content,
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    typia.assert(updatedComment);
    currentComment = updatedComment;
  }
  // Test search with edit sequence range filter
  const sequenceRangeResult =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        body: {
          edit_sequence_min: 2,
          edit_sequence_max: 4,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(sequenceRangeResult);
  TestValidator.predicate(
    "sequence range filter returns results",
    sequenceRangeResult.data.length > 0,
  );
  // Test search with content keyword filter
  const keyword = editContents[2].substring(0, 10);
  const contentSearchResult =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        body: {
          content_search: keyword,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(contentSearchResult);
  TestValidator.predicate(
    "content search returns matching results",
    contentSearchResult.data.length > 0,
  );
  // Test search with date range filter
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date().toISOString();
  const dateRangeResult =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        body: {
          created_at_start: startDate,
          created_at_end: endDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns results",
    dateRangeResult.data.length > 0,
  );
  // Test pagination
  const paginationResult =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination limit works correctly",
    paginationResult.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination metadata is correct",
    paginationResult.pagination.limit === 2 &&
      paginationResult.pagination.current === 1,
  );
}

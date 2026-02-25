import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_edit_history_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. User setup and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.IJoin;
  const userAuthorized = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  // 3. Administrator creates an article
  const article = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. User creates a comment with multiple edits
  const commentCreateBody = {
    content: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IDiscussionBoardComment.ICreate;
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);
  // Wait to create temporal separation for date filtering
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Administrator tests filtered search on edit history
  // First get all edit history without filters to validate total records
  const allHistory =
    await api.functional.discussionBoard.admin.comments.edit_histories.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  TestValidator.predicate(
    "should have edit history records",
    allHistory.data.length > 0,
  );
  // Test edit sequence filtering
  const sequenceFiltered =
    await api.functional.discussionBoard.admin.comments.edit_histories.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          edit_sequence_min: 1,
          edit_sequence_max: 1,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(sequenceFiltered);
  TestValidator.predicate(
    "edit sequence filter returns correct records",
    sequenceFiltered.data.every(
      (record) => record.edit_sequence >= 1 && record.edit_sequence <= 1,
    ),
  );
  // Test date range filtering
  const now = new Date().toISOString();
  const past = new Date(Date.now() - 60000).toISOString();
  const dateFiltered =
    await api.functional.discussionBoard.admin.comments.edit_histories.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          created_at_min: past,
          created_at_max: now,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date filter returns records within time range",
    dateFiltered.data.length > 0,
  );
  // Test text search (should find something since we have content)
  const searchFiltered =
    await api.functional.discussionBoard.admin.comments.edit_histories.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          search: commentCreateBody.content.substring(0, 10),
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(searchFiltered);
  TestValidator.predicate(
    "search filter returns some results",
    searchFiltered.data.length > 0,
  );
  // Test pagination with filtered results
  const paginated =
    await api.functional.discussionBoard.admin.comments.edit_histories.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.predicate(
    "pagination returns limited results",
    paginated.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination info is correct",
    paginated.pagination.current === 1 && paginated.pagination.limit === 2,
  );
}

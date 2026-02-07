import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_comments_reports_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_reports_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_report } from "../../../prepare/prepare_random_discussion_board_comment_report";

export async function test_api_comment_report_different_users_same_comment(
  connection: api.IConnection,
): Promise<void> {
  // Create first user who will report the comment
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(firstUser);
  // Create second user who will also report the comment
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(secondUser);
  // Create an article containing the comment
  // Note: We need a valid section_id, but since we don't have admin access to create sections,
  // we'll use a placeholder UUID. In a real test environment, this would need proper section setup.
  const article = await api.functional.discussionBoard.user.articles.create(
    firstUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: "00000000-0000-0000-0000-000000000000" satisfies string &
          tags.Format<"uuid"> as string & tags.Format<"uuid">,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create the comment that will be reported by multiple users
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      firstUserConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 15,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // First user reports the comment
  const firstReport =
    await api.functional.discussionBoard.user.articles.comments.reports.create(
      firstUserConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardCommentReport.ICreate,
      },
    );
  typia.assert(firstReport);
  // Validate first report has correct reporter association
  TestValidator.equals(
    "first report reporter ID",
    firstReport.reporter.id,
    firstUser.id,
  );
  TestValidator.equals(
    "first report comment ID",
    firstReport.reportedComment.id,
    comment.id,
  );
  // Second user reports the same comment
  const secondReport =
    await api.functional.discussionBoard.user.articles.comments.reports.create(
      secondUserConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardCommentReport.ICreate,
      },
    );
  typia.assert(secondReport);
  // Validate second report has correct reporter association
  TestValidator.equals(
    "second report reporter ID",
    secondReport.reporter.id,
    secondUser.id,
  );
  TestValidator.equals(
    "second report comment ID",
    secondReport.reportedComment.id,
    comment.id,
  );
  // Verify reports are distinct and have different IDs
  TestValidator.notEquals(
    "report IDs should be different",
    firstReport.id,
    secondReport.id,
  );
  // Test that the same user cannot report the same comment twice
  await TestValidator.error("same user duplicate report", async () => {
    await api.functional.discussionBoard.user.articles.comments.reports.create(
      firstUserConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardCommentReport.ICreate,
      },
    );
  });
}

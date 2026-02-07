import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_comments_reports_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_reports_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_report } from "../../../prepare/prepare_random_discussion_board_comment_report";

export async function test_api_comment_report_update_reason_modification(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
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
          sentenceMax: 8,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment on the article
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Create initial comment report
  const initialReason = RandomGenerator.paragraph({ sentences: 1 });
  const report =
    await api.functional.discussionBoard.user.articles.comments.reports.create(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reason: initialReason,
        } satisfies IDiscussionBoardCommentReport.ICreate,
      },
    );
  typia.assert(report);
  // Update the report reason
  const updatedReason = initialReason + " Additional clarification details.";
  const updatedReport =
    await api.functional.discussionBoard.admin.articles.comments.reports.update(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        reportId: report.id,
        body: {
          reason: updatedReason,
        } satisfies IDiscussionBoardCommentReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // Validate that reason was updated
  TestValidator.equals(
    "reason should be updated",
    updatedReport.reason,
    updatedReason,
  );
  TestValidator.notEquals(
    "reason should differ from original",
    updatedReport.reason,
    initialReason,
  );
  // Validate that other fields remain unchanged
  TestValidator.equals(
    "status should remain unchanged",
    updatedReport.status,
    report.status,
  );
  TestValidator.equals(
    "id should remain unchanged",
    updatedReport.id,
    report.id,
  );
  TestValidator.equals(
    "reporter should remain unchanged",
    updatedReport.reporter.id,
    report.reporter.id,
  );
  TestValidator.equals(
    "reportedComment should remain unchanged",
    updatedReport.reportedComment.id,
    report.reportedComment.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedReport.created_at,
    report.created_at,
  );
  // Validate that partial update didn't affect unspecified fields
  TestValidator.predicate(
    "resolution_details should remain null",
    updatedReport.resolution_details === null,
  );
  TestValidator.predicate(
    "resolved_at should remain null",
    updatedReport.resolved_at === null,
  );
}

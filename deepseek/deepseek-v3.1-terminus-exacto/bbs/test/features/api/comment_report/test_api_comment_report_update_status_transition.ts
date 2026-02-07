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

export async function test_api_comment_report_update_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
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
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article as the user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Add a comment to the article
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
  // Report the comment as the user
  const report =
    await generate_random_discussion_board_user_articles_comments_reports_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCommentReport.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(report);
  // Validate initial report status is 'pending'
  TestValidator.equals("initial report status", report.status, "pending");
  TestValidator.equals(
    "initial resolution details",
    report.resolution_details,
    null,
  );
  TestValidator.equals("initial resolved_at", report.resolved_at, null);
  TestValidator.predicate(
    "created_at timestamp set",
    report.created_at !== null,
  );
  // Administrator updates report status to 'under_review'
  const underReviewUpdate =
    await api.functional.discussionBoard.admin.articles.comments.reports.update(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        reportId: report.id,
        body: {
          status: "under_review",
        } satisfies IDiscussionBoardCommentReport.IUpdate,
      },
    );
  typia.assert(underReviewUpdate);
  // Validate status transition to 'under_review'
  TestValidator.equals(
    "status after under_review update",
    underReviewUpdate.status,
    "under_review",
  );
  TestValidator.notEquals(
    "updated_at changed after under_review",
    underReviewUpdate.updated_at,
    report.updated_at,
  );
  TestValidator.equals(
    "resolution details still null",
    underReviewUpdate.resolution_details,
    null,
  );
  TestValidator.equals(
    "resolved_at still null",
    underReviewUpdate.resolved_at,
    null,
  );
  // Administrator updates report status to 'resolved' with resolution details
  const resolutionDetails = RandomGenerator.paragraph({ sentences: 2 });
  const resolvedUpdate =
    await api.functional.discussionBoard.admin.articles.comments.reports.update(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        reportId: report.id,
        body: {
          status: "resolved",
          resolution_details: resolutionDetails,
        } satisfies IDiscussionBoardCommentReport.IUpdate,
      },
    );
  typia.assert(resolvedUpdate);
  // Validate final status transition to 'resolved'
  TestValidator.equals(
    "status after resolved update",
    resolvedUpdate.status,
    "resolved",
  );
  TestValidator.notEquals(
    "updated_at changed after resolved",
    resolvedUpdate.updated_at,
    underReviewUpdate.updated_at,
  );
  TestValidator.equals(
    "resolution details set",
    resolvedUpdate.resolution_details,
    resolutionDetails,
  );
  TestValidator.predicate(
    "resolved_at timestamp set",
    resolvedUpdate.resolved_at !== null,
  );
  // Validate reporter and reported comment relationships remain consistent
  TestValidator.equals(
    "reporter ID unchanged",
    resolvedUpdate.reporter.id,
    report.reporter.id,
  );
  TestValidator.equals(
    "reported comment ID unchanged",
    resolvedUpdate.reportedComment.id,
    report.reportedComment.id,
  );
}

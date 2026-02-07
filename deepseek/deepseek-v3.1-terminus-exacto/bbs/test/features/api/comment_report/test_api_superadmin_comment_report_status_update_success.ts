import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_comments_reports_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_reports_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_report } from "../../../prepare/prepare_random_discussion_board_comment_report";

export async function test_api_superadmin_comment_report_status_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate as regular user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  // Create article as user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // Assuming default section exists
        status: "published" as const,
      },
    },
  );
  typia.assert(article);
  // Create comment on article as user
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(comment);
  // Create comment report with 'pending' status as user
  const initialReport =
    await generate_random_discussion_board_user_articles_comments_reports_create(
      userConnection,
      {
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(initialReport);
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    },
  });
  // Update report status from 'pending' to 'under_review' with resolution details
  const updatedReport =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.update(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        reportId: initialReport.id,
        body: {
          status: "under_review",
          resolution_details: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(updatedReport);
  // Validate the report update
  TestValidator.equals(
    "report status updated to under_review",
    updatedReport.status,
    "under_review",
  );
  TestValidator.predicate(
    "resolution details are saved",
    () =>
      updatedReport.resolution_details !== null &&
      updatedReport.resolution_details !== undefined,
  );
  TestValidator.predicate(
    "resolved_at timestamp is set",
    () =>
      updatedReport.resolved_at !== null &&
      updatedReport.resolved_at !== undefined,
  );
  TestValidator.equals(
    "report id remains the same",
    updatedReport.id,
    initialReport.id,
  );
  TestValidator.equals(
    "reporter remains the same",
    updatedReport.reporter.id,
    initialReport.reporter.id,
  );
  TestValidator.equals(
    "reported comment remains the same",
    updatedReport.reportedComment.id,
    initialReport.reportedComment.id,
  );
  TestValidator.predicate(
    "updated_at timestamp should be newer than created_at",
    () =>
      new Date(updatedReport.updated_at) > new Date(initialReport.created_at),
  );
}

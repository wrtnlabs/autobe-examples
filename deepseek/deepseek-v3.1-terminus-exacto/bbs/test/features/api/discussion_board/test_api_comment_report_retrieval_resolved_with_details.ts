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

export async function test_api_comment_report_retrieval_resolved_with_details(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: typia.random<string & tags.MinLength<1>>(),
      bio: typia.random<string | null>(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: typia.random<string & tags.MinLength<5> & tags.MaxLength<200>>(),
        content: typia.random<string & tags.MinLength<50>>(),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: typia.random<string>(),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Create a report for the comment
  const report =
    await generate_random_discussion_board_user_articles_comments_reports_create(
      userConnection,
      {
        body: {
          reason: typia.random<string>(),
        } satisfies IDiscussionBoardCommentReport.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(report);
  // Update the report status to resolved with resolution details
  const updatedReport =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.update(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        reportId: report.id,
        body: {
          status: "resolved",
          resolution_details:
            "This comment has been reviewed and resolved by the moderation team.",
        } satisfies IDiscussionBoardCommentReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // Retrieve the resolved report
  const retrievedReport =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.at(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // Validate the report details
  TestValidator.equals("report id matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report reason preserved",
    retrievedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "report status is resolved",
    retrievedReport.status,
    "resolved",
  );
  TestValidator.equals(
    "resolution details are set",
    retrievedReport.resolution_details,
    "This comment has been reviewed and resolved by the moderation team.",
  );
  TestValidator.predicate(
    "resolved_at timestamp is set",
    retrievedReport.resolved_at !== null,
  );
  TestValidator.equals(
    "reporter id matches",
    retrievedReport.reporter.id,
    user.id,
  );
  TestValidator.equals(
    "reported comment id matches",
    retrievedReport.reportedComment.id,
    comment.id,
  );
}

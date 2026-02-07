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

/**
 * Test complete moderation workflow by updating a report from 'under_review' to 'resolved' with comprehensive resolution details.
 * Simulates a real moderation scenario where a super administrator resolves a report after investigation,
 * updating both status and reason fields while adding detailed resolution notes.
 */
export async function test_api_superadmin_comment_report_complete_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate regular user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 2. Create article as user
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create comment on the article
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 12,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Create report for the comment (initially 'pending' status)
  const initialReport =
    await api.functional.discussionBoard.user.articles.comments.reports.create(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
        } satisfies IDiscussionBoardCommentReport.ICreate,
      },
    );
  typia.assert(initialReport);
  // 5. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 6. First update: Change status from 'pending' to 'under_review' to match scenario
  const underReviewReport =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.update(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        reportId: initialReport.id,
        body: {
          status: "under_review",
        } satisfies IDiscussionBoardCommentReport.IUpdate,
      },
    );
  typia.assert(underReviewReport);
  // 7. Final update: Change status from 'under_review' to 'resolved' with resolution details
  const updateData: IDiscussionBoardCommentReport.IUpdate = {
    status: "resolved",
    reason:
      "Updated reason after investigation: " +
      RandomGenerator.paragraph({ sentences: 1 }),
    resolution_details:
      "Comment was reviewed and found to be compliant with community guidelines. No action required.",
  };
  const resolvedReport =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.update(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        reportId: initialReport.id,
        body: updateData,
      },
    );
  typia.assert(resolvedReport);
  // 8. Validate the complete workflow
  TestValidator.equals(
    "report ID remains consistent",
    resolvedReport.id,
    initialReport.id,
  );
  TestValidator.equals(
    "status updated to resolved",
    resolvedReport.status,
    "resolved",
  );
  TestValidator.notEquals(
    "reason was updated",
    resolvedReport.reason,
    initialReport.reason,
  );
  TestValidator.predicate(
    "resolution details added",
    resolvedReport.resolution_details !== null &&
      resolvedReport.resolution_details !== undefined,
  );
  TestValidator.predicate(
    "resolved_at timestamp set",
    resolvedReport.resolved_at !== null &&
      resolvedReport.resolved_at !== undefined,
  );
  TestValidator.equals(
    "reporter remains the same",
    resolvedReport.reporter.id,
    initialReport.reporter.id,
  );
  TestValidator.equals(
    "reported comment remains the same",
    resolvedReport.reportedComment.id,
    initialReport.reportedComment.id,
  );
  TestValidator.predicate(
    "updated_at timestamp newer than created_at",
    new Date(resolvedReport.updated_at) > new Date(resolvedReport.created_at),
  );
  // Additional validation for the intermediate state
  TestValidator.equals(
    "intermediate status was under_review",
    underReviewReport.status,
    "under_review",
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentReport";
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

export async function test_api_admin_comment_reports_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
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
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article using utility function
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment using utility function
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
  // Create multiple reports - they will all start with 'pending' status
  const reportReasons = [
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 2 }),
  ];
  const reports: IDiscussionBoardCommentReport[] = [];
  for (const reason of reportReasons) {
    const report =
      await generate_random_discussion_board_user_articles_comments_reports_create(
        userConnection,
        {
          body: {
            reason,
          } satisfies IDiscussionBoardCommentReport.ICreate,
          params: {
            articleId: article.id,
            commentId: comment.id,
          },
        },
      );
    typia.assert(report);
    reports.push(report);
  }
  // Test filtering by pending status (all reports should be pending initially)
  const pendingResults =
    await api.functional.discussionBoard.admin.articles.comments.reports.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          status: "pending" as const,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(pendingResults);
  // Test filtering by under_review status (should return empty since no reports are under_review)
  const underReviewResults =
    await api.functional.discussionBoard.admin.articles.comments.reports.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          status: "under_review" as const,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(underReviewResults);
  // Test filtering by resolved status (should return empty since no reports are resolved)
  const resolvedResults =
    await api.functional.discussionBoard.admin.articles.comments.reports.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          status: "resolved" as const,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(resolvedResults);
  // Validate that pending filter returns only pending reports
  TestValidator.equals(
    "pending filter returns only pending reports",
    pendingResults.data.every((report) => report.status === "pending"),
    true,
  );
  // Validate that under_review filter returns empty when no under_review reports exist
  TestValidator.equals(
    "under_review filter returns empty when no under_review reports",
    underReviewResults.data.length,
    0,
  );
  // Validate that resolved filter returns empty when no resolved reports exist
  TestValidator.equals(
    "resolved filter returns empty when no resolved reports",
    resolvedResults.data.length,
    0,
  );
  // Test without status filter (should return all reports)
  const allResults =
    await api.functional.discussionBoard.admin.articles.comments.reports.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(allResults);
  TestValidator.equals(
    "no filter returns all reports",
    allResults.data.length >= reports.length,
    true,
  );
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    allResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    allResults.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    allResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    allResults.pagination.pages >= 0,
  );
}

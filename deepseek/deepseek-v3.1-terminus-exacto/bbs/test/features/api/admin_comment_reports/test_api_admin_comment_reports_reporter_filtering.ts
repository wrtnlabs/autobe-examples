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

/**
 * Test filtering comment reports by specific reporter.
 *
 * Creates multiple reports from different users on the same comment,
 * then verifies that filtering by reporter_user_id returns only reports
 * submitted by that specific user while excluding reports from other users.
 */
export async function test_api_admin_comment_reports_reporter_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first user who will create the article and comment
  const articleAuthorConnection: api.IConnection = { host: connection.host };
  const articleAuthor = await authorize_user_join(articleAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(articleAuthor);
  // 2. Create test article (using user connection, not admin)
  const article = await generate_random_discussion_board_user_articles_create(
    articleAuthorConnection,
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
  // 3. Create test comment
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      articleAuthorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(comment);
  // 4. Admin setup for filtering operation
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
  // 5. Create multiple users and their reports
  const users: IDiscussionBoardUser.IAuthorized[] = [];
  const reports: IDiscussionBoardCommentReport[] = [];
  for (let i = 0; i < 3; i++) {
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
    users.push(user);
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
    reports.push(report);
  }
  // 6. Test filtering by specific reporter
  const targetReporter = users[1]; // Use the second user as target
  const filteredReports =
    await api.functional.discussionBoard.admin.articles.comments.reports.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reporter_user_id: targetReporter.id,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(filteredReports);
  // 7. Validate filtering results
  TestValidator.equals(
    "only reports from target reporter",
    filteredReports.data.length,
    1,
  );
  TestValidator.equals(
    "reporter ID matches target user",
    filteredReports.data[0].reporter.id,
    targetReporter.id,
  );
  TestValidator.equals(
    "reporter display name matches",
    filteredReports.data[0].reporter.display_name,
    targetReporter.display_name,
  );
  // 8. Verify pagination info
  TestValidator.predicate(
    "pagination shows correct total records",
    filteredReports.pagination.records === 1,
  );
  TestValidator.predicate(
    "pagination shows correct page count",
    filteredReports.pagination.pages === 1,
  );
  // 9. Verify exclusion of other reporters
  const allReports =
    await api.functional.discussionBoard.admin.articles.comments.reports.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {} satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.equals(
    "all reports are present without filtering",
    allReports.data.length,
    3,
  );
}

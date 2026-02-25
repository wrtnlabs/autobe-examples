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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_comments_reports_create } from "../../../generate/generate_random_discussion_board_user_comments_reports_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_report } from "../../../prepare/prepare_random_discussion_board_comment_report";

export async function test_api_comment_report_pagination_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Setup user connection for creating articles and comments
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment
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
  // Create multiple users to generate reports
  const reportCount = 75; // More than default page limit
  const reporters: api.IConnection[] = [];
  for (let i = 0; i < reportCount; i++) {
    const reporterConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(reporterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "reporter123",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    reporters.push(reporterConnection);
  }
  // Generate reports from different users
  const reportReasons = [
    "Inappropriate content",
    "Spam",
    "Harassment",
    "Hate speech",
    "Misinformation",
  ] as const;
  for (let i = 0; i < reportCount; i++) {
    await generate_random_discussion_board_user_comments_reports_create(
      reporters[i],
      {
        body: {
          reason: RandomGenerator.pick(reportReasons),
        } satisfies IDiscussionBoardCommentReport.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  }
  // Test pagination with default limit
  const defaultPage =
    await api.functional.discussionBoard.admin.comments.reports.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page should be page 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records should match report count",
    defaultPage.pagination.records === reportCount,
  );
  TestValidator.predicate(
    "data length should be less than or equal to limit",
    defaultPage.data.length <= defaultPage.pagination.limit,
  );
  // Test different page requests
  const totalPages = Math.ceil(reportCount / defaultPage.pagination.limit);
  // Test middle page
  let middlePage: IPageIDiscussionBoardCommentReport.ISummary | null = null;
  if (totalPages > 2) {
    const middlePageNum = Math.floor(totalPages / 2);
    middlePage =
      await api.functional.discussionBoard.admin.comments.reports.index(
        adminConnection,
        {
          commentId: comment.id,
          body: {
            page: middlePageNum,
          } satisfies IDiscussionBoardCommentReport.IRequest,
        },
      );
    typia.assert(middlePage);
    TestValidator.equals(
      "middle page number",
      middlePage.pagination.current,
      middlePageNum,
    );
  }
  // Test last page
  const lastPage =
    await api.functional.discussionBoard.admin.comments.reports.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          page: totalPages,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page number",
    lastPage.pagination.current,
    totalPages,
  );
  // Test custom limit
  const customLimit = 10;
  const customPage =
    await api.functional.discussionBoard.admin.comments.reports.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: customLimit,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(customPage);
  TestValidator.equals(
    "custom limit applied",
    customPage.pagination.limit,
    customLimit,
  );
  TestValidator.predicate(
    "data length should match custom limit",
    customPage.data.length <= customLimit,
  );
  // Test maximum limit
  const maxLimitPage =
    await api.functional.discussionBoard.admin.comments.reports.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 100, // Maximum allowed limit
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "maximum limit applied",
    maxLimitPage.pagination.limit,
    100,
  );
  // Test page beyond total pages (should return empty data)
  const beyondPage =
    await api.functional.discussionBoard.admin.comments.reports.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          page: totalPages + 1,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "page beyond total pages",
    beyondPage.pagination.current,
    totalPages + 1,
  );
  TestValidator.predicate(
    "data should be empty for beyond page",
    beyondPage.data.length === 0,
  );
  // Verify pagination metadata consistency
  TestValidator.equals(
    "total pages calculation",
    defaultPage.pagination.pages,
    totalPages,
  );
  // Only check records consistency if middle page exists
  if (middlePage) {
    TestValidator.predicate(
      "records count should be consistent",
      defaultPage.pagination.records === middlePage.pagination.records &&
        defaultPage.pagination.records === lastPage.pagination.records,
    );
  } else {
    TestValidator.predicate(
      "records count should be consistent",
      defaultPage.pagination.records === lastPage.pagination.records,
    );
  }
}

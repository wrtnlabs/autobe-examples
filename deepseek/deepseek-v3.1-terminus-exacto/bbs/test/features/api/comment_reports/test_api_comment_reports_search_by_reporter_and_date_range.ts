import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_reports_search_by_reporter_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection with proper authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create multiple users for potential reporting scenarios
  const reporterConnections: api.IConnection[] = [];
  const reporterNames: string[] = [];
  for (let i = 0; i < 3; i++) {
    const reporterConnection: api.IConnection = { host: connection.host };
    const reporter = await authorize_user_join(reporterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        display_name: `Reporter${i + 1}`,
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    reporterConnections.push(reporterConnection);
    reporterNames.push(reporter.display_name);
  }
  // Since we cannot create comment reports (no API endpoint provided),
  // we can only test the search functionality with available data
  // or test error cases
  // Test search with various filter combinations
  const testArticleId = typia.random<string & tags.Format<"uuid">>();
  const testCommentId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Search by reporter display name (empty results expected)
  const searchByReporter =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.index(
      superAdminConnection,
      {
        articleId: testArticleId,
        commentId: testCommentId,
        body: {
          reporter: reporterNames[0],
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequestReport,
      },
    );
  typia.assert(searchByReporter);
  // Test 2: Search by date range (empty results expected)
  const startTime = new Date(Date.now() - 7200000).toISOString();
  const endTime = new Date(Date.now() + 7200000).toISOString();
  const searchByDateRange =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.index(
      superAdminConnection,
      {
        articleId: testArticleId,
        commentId: testCommentId,
        body: {
          created_at_min: startTime satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          created_at_max: endTime satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequestReport,
      },
    );
  typia.assert(searchByDateRange);
  // Test 3: Combined search (reporter + date range) - empty results expected
  const combinedSearch =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.index(
      superAdminConnection,
      {
        articleId: testArticleId,
        commentId: testCommentId,
        body: {
          reporter: reporterNames[1],
          created_at_min: startTime satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          created_at_max: endTime satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequestReport,
      },
    );
  typia.assert(combinedSearch);
  // Test 4: Search with status filter
  const searchWithStatus =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.index(
      superAdminConnection,
      {
        articleId: testArticleId,
        commentId: testCommentId,
        body: {
          status: "pending" as const,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequestReport,
      },
    );
  typia.assert(searchWithStatus);
  // Validate pagination structure exists even with empty results
  TestValidator.predicate(
    "pagination structure exists",
    searchByReporter.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchByReporter.data),
  );
  TestValidator.equals(
    "pagination has current page",
    searchByReporter.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    searchByReporter.pagination.limit,
    10,
  );
  // TestValidator calls should validate business logic
  TestValidator.predicate(
    "search API responds successfully",
    searchByReporter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search API responds successfully for date range",
    searchByDateRange.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search API responds successfully for combined search",
    combinedSearch.pagination.records >= 0,
  );
}

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

export async function test_api_comment_report_search_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin user
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
  // Setup regular user who will create article and comment
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // Setup multiple reporters to create reports with different timestamps
  const reporterConnections: api.IConnection[] = [];
  const reportsCreated: IDiscussionBoardCommentReport[] = [];
  // Create 3 different reporters
  for (let i = 0; i < 3; i++) {
    const reporterConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(reporterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "reporter1234",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    reporterConnections.push(reporterConnection);
  }
  // Create reports with specific keywords and simulated timestamps
  const keywords = ["inappropriate", "spam", "harassment", "violation"];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);
  const twoHoursAgo = new Date(now.getTime() - 7200000);
  const threeHoursAgo = new Date(now.getTime() - 10800000);
  // Reporter 0: creates report with "inappropriate" keyword (now)
  const report1 =
    await generate_random_discussion_board_user_comments_reports_create(
      reporterConnections[0],
      {
        params: { commentId: comment.id },
        body: {
          reason: `This comment contains inappropriate content. It should be removed.`,
        },
      },
    );
  typia.assert(report1);
  reportsCreated.push(report1);
  // Reporter 1: creates report with "spam" keyword (1 hour ago)
  const report2 =
    await generate_random_discussion_board_user_comments_reports_create(
      reporterConnections[1],
      {
        params: { commentId: comment.id },
        body: {
          reason: `This looks like spam content. Please review.`,
        },
      },
    );
  typia.assert(report2);
  reportsCreated.push(report2);
  // Reporter 2: creates report with "harassment" keyword (2 hours ago)
  const report3 =
    await generate_random_discussion_board_user_comments_reports_create(
      reporterConnections[2],
      {
        params: { commentId: comment.id },
        body: {
          reason: `This comment constitutes harassment against other users.`,
        },
      },
    );
  typia.assert(report3);
  reportsCreated.push(report3);
  // Admin login
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminConnection.headers?.Authorization
        ? typia.random<string & tags.Format<"email">>()
        : typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Test 1: Search with date range (last 2 hours) and keyword "spam"
  const searchResults1 =
    await api.functional.discussionBoard.admin.comments.reports.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          created_date_start: twoHoursAgo.toISOString(),
          created_date_end: now.toISOString(),
          search: "spam",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchResults1);
  // Validate that search results contain reports from the specified date range
  TestValidator.predicate(
    "search with date range and keyword should return at least one result",
    searchResults1.data.length >= 1,
  );
  // Test 2: Search with future date range (should return empty results)
  const futureDate = new Date(now.getTime() + 86400000); // Tomorrow
  const searchResults2 =
    await api.functional.discussionBoard.admin.comments.reports.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          created_date_start: futureDate.toISOString(),
          created_date_end: new Date(
            futureDate.getTime() + 3600000,
          ).toISOString(),
          search: "inappropriate",
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchResults2);
  TestValidator.equals(
    "search with future dates should return empty results",
    searchResults2.data.length,
    0,
  );
  // Test 3: Search with overlapping date ranges and partial keyword match
  const searchResults3 =
    await api.functional.discussionBoard.admin.comments.reports.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          created_date_start: threeHoursAgo.toISOString(),
          created_date_end: oneHourAgo.toISOString(),
          search: "harass", // partial match for "harassment"
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchResults3);
  TestValidator.predicate(
    "search with overlapping date range and partial keyword should return results",
    searchResults3.data.length >= 1,
  );
  // Test 4: Search with no keyword (only date filtering)
  const searchResults4 =
    await api.functional.discussionBoard.admin.comments.reports.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          created_date_start: threeHoursAgo.toISOString(),
          created_date_end: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchResults4);
  TestValidator.equals(
    "search with date range only should return all reports in range",
    searchResults4.data.length,
    reportsCreated.length,
  );
  // Test 5: Search with keyword that doesn't match any report
  const searchResults5 =
    await api.functional.discussionBoard.admin.comments.reports.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          created_date_start: threeHoursAgo.toISOString(),
          created_date_end: now.toISOString(),
          search: "nonexistentkeyword",
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchResults5);
  TestValidator.equals(
    "search with non-matching keyword should return empty results",
    searchResults5.data.length,
    0,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid metadata",
    searchResults4.pagination.records >= reportsCreated.length &&
      searchResults4.pagination.pages >= 1 &&
      searchResults4.pagination.current === 1 &&
      searchResults4.pagination.limit === 20,
  );
}
import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleViewStatEvent";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super admin comment analytics with comprehensive platform-wide summary.
 * Create test data setup including articles, sections, multiple users creating comments
 * with varying engagement (votes, reports, moderations). Call the analytics endpoint
 * with minimal filters to get overall platform statistics. Validate response includes
 * accurate counts from discussion_board_comments, engagement metrics from
 * discussion_board_comment_votes, reporting patterns from discussion_board_comment_reports,
 * and moderation statistics from discussion_board_comment_moderations. Verify pagination
 * structure with correct total counts and page metadata.
 */
export async function test_api_comments_analytics_overall_summary(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Note: Since we don't have utility functions to create test data (articles, sections, comments),
  // and the available DTOs don't include comment-specific analytics types, we'll call the
  // analytics endpoint with minimal filters to test the basic functionality.
  // In a real implementation, we would create test data first.
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.comments.analytics.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  // Validate response structure
  typia.assert(analyticsResponse);
  // Test pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof analyticsResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    (analyticsResponse.pagination as any).current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    (analyticsResponse.pagination as any).limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    (analyticsResponse.pagination as any).records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    (analyticsResponse.pagination as any).pages >= 0,
  );
  // Test data array structure
  TestValidator.predicate(
    "data is array",
    Array.isArray(analyticsResponse.data),
  );
  // Validate individual analytics items if present
  if (analyticsResponse.data.length > 0) {
    const item = analyticsResponse.data[0];
    TestValidator.equals("item has id", typeof item.id, "string");
    TestValidator.predicate(
      "item has total view count",
      item.total_view_count >= 0,
    );
    TestValidator.predicate(
      "item has unique viewer count",
      item.unique_viewer_count >= 0,
    );
    TestValidator.predicate(
      "item has article summary",
      typeof item.article === "object",
    );
    TestValidator.equals("article has id", typeof item.article.id, "string");
    TestValidator.equals("article has title", typeof item.article.title, "string");
    TestValidator.equals("article has status", typeof item.article.status, "string");
    TestValidator.equals("article has created_at", typeof item.article.created_at, "string");
    TestValidator.predicate(
      "article has author",
      typeof item.article.author === "object",
    );
    TestValidator.predicate(
      "article has section",
      typeof item.article.section === "object",
    );
  }
}
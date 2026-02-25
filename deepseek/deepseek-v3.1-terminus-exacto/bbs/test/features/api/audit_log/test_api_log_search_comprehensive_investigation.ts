import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_log_search_comprehensive_investigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate test audit log data by creating articles
  const article1 = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  const article2 = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  // 3. Wait a moment to ensure logs have different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Execute comprehensive log search with multiple filters
  const searchResponse = await api.functional.discussionBoard.admin.logs.index(
    adminConnection,
    {
      body: {
        action_type: "article_create",
        actor_type: "admin",
        target_article_id: article1.id,
        success: true,
        search_term: "article",
        created_at_start: new Date(Date.now() - 30000).toISOString(),
        created_at_end: new Date().toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAuditLog.IRequest,
    },
  );
  typia.assert(searchResponse);
  // 5. Validate response structure and pagination
  TestValidator.predicate(
    "pagination object exists",
    searchResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    (searchResponse.pagination as any).current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    (searchResponse.pagination as any).limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    (searchResponse.pagination as any).records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    (searchResponse.pagination as any).pages >= 0,
  );
  // 6. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(searchResponse.data));
  if (searchResponse.data.length > 0) {
    const logEntry = searchResponse.data[0];
    typia.assert(logEntry);
    TestValidator.predicate(
      "log entry has required fields",
      logEntry.id !== undefined &&
        logEntry.action_type !== undefined &&
        logEntry.description !== undefined &&
        logEntry.success !== undefined &&
        logEntry.created_at !== undefined &&
        logEntry.actor_type !== undefined,
    );
  }
  // 7. Test pagination by requesting second page
  const page2Response = await api.functional.discussionBoard.admin.logs.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardAuditLog.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current page is 2",
    (page2Response.pagination as any).current,
    2,
  );
  // 8. Test search with different filter combinations
  const failedActionSearch =
    await api.functional.discussionBoard.admin.logs.index(adminConnection, {
      body: {
        success: false,
        limit: 5,
      } satisfies IDiscussionBoardAuditLog.IRequest,
    });
  typia.assert(failedActionSearch);
  // 9. Test search with specific date range
  const dateRangeSearch = await api.functional.discussionBoard.admin.logs.index(
    adminConnection,
    {
      body: {
        created_at_start: new Date(Date.now() - 60000).toISOString(),
        created_at_end: new Date().toISOString(),
        limit: 5,
      } satisfies IDiscussionBoardAuditLog.IRequest,
    },
  );
  typia.assert(dateRangeSearch);
}
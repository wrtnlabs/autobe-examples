import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_audit_log_search_filter_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create test user accounts and generate audit events
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate article creation audit event
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
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
  typia.assert(article);
  // Generate admin deletion audit event
  await api.functional.discussionBoard.admin.articles.erase(adminConnection, {
    articleId: article.id,
  });
  // Wait a moment for audit events to be recorded
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Search all audit logs with pagination
  const allLogs =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(allLogs);
  TestValidator.predicate(
    "should return paginated results",
    allLogs.data.length <= 10,
  );
  // Test 2: Filter by action_type
  const actionTypeLogs =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action_type: "article_create",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(actionTypeLogs);
  TestValidator.predicate(
    "should return article_create events",
    actionTypeLogs.data.some((log) => log.action_type === "article_create"),
  );
  // Test 3: Filter by actor_type
  const actorTypeLogs =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          actor_type: "user",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(actorTypeLogs);
  TestValidator.predicate(
    "should return user actor events",
    actorTypeLogs.data.some((log) => log.actor_type === "user"),
  );
  // Test 4: Filter by target_article_id
  const targetArticleLogs =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          target_article_id: article.id,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(targetArticleLogs);
  TestValidator.predicate(
    "should return events for target article",
    targetArticleLogs.data.some((log) => log.target_article_id === article.id),
  );
  // Test 5: Filter by success status
  const successLogs =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          success: true,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(successLogs);
  TestValidator.predicate(
    "should return successful events",
    successLogs.data.every((log) => log.success === true),
  );
  // Test 6: Date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const dateRangeLogs =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          created_at_start: oneHourAgo,
          created_at_end: oneHourLater,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeLogs);
  TestValidator.predicate(
    "should return events within date range",
    dateRangeLogs.data.every((log) => {
      const logDate = new Date(log.created_at);
      const startDate = new Date(oneHourAgo);
      const endDate = new Date(oneHourLater);
      return logDate >= startDate && logDate <= endDate;
    }),
  );
  // Test 7: Text search on description
  const searchTermLogs =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          search_term: "article",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(searchTermLogs);
  TestValidator.predicate(
    "should return events matching search term",
    searchTermLogs.data.some((log) =>
      log.description.toLowerCase().includes("article"),
    ),
  );
  // Test 8: Combined filters
  const combinedLogs =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action_type: "article_delete",
          actor_type: "admin",
          success: true,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(combinedLogs);
  TestValidator.predicate(
    "should return events matching all combined filters",
    combinedLogs.data.every(
      (log) =>
        log.action_type === "article_delete" &&
        log.actor_type === "admin" &&
        log.success === true,
    ),
  );
}

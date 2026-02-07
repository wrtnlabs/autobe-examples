import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_moderation_efficiency_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator using available utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Test 1: Basic analytics request with default pagination
  const basicAnalytics =
    await api.functional.discussionBoard.admin.analytics.moderation_efficiency.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(basicAnalytics);
  // Validate pagination structure
  TestValidator.predicate(
    "has current page",
    basicAnalytics.pagination.current >= 0,
  );
  TestValidator.predicate("has limit", basicAnalytics.pagination.limit >= 0);
  TestValidator.predicate(
    "has records count",
    basicAnalytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    basicAnalytics.pagination.pages >= 0,
  );
  // Test 2: Filter by specific action type
  const actionTypeAnalytics =
    await api.functional.discussionBoard.admin.analytics.moderation_efficiency.index(
      adminConnection,
      {
        body: {
          action_type: "delete_article",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(actionTypeAnalytics);
  // Test 3: Filter by date range
  const now = new Date().toISOString();
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeAnalytics =
    await api.functional.discussionBoard.admin.analytics.moderation_efficiency.index(
      adminConnection,
      {
        body: {
          performed_at_from: oneWeekAgo,
          performed_at_to: now,
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(dateRangeAnalytics);
  // Test 4: Filter by status
  const statusAnalytics =
    await api.functional.discussionBoard.admin.analytics.moderation_efficiency.index(
      adminConnection,
      {
        body: {
          status: "completed",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(statusAnalytics);
  // Test 5: Complex filter combination
  const complexAnalytics =
    await api.functional.discussionBoard.admin.analytics.moderation_efficiency.index(
      adminConnection,
      {
        body: {
          action_type: "ban_user",
          status: "completed",
          performed_at_from: oneWeekAgo,
          performed_at_to: now,
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(complexAnalytics);
  // Test pagination boundaries
  const highPageAnalytics =
    await api.functional.discussionBoard.admin.analytics.moderation_efficiency.index(
      adminConnection,
      {
        body: {
          page: 100,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(highPageAnalytics);
  TestValidator.predicate(
    "high page returns valid data",
    Array.isArray(highPageAnalytics.data),
  );
}

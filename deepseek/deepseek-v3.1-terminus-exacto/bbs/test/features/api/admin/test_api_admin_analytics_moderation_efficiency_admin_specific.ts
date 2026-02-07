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

export async function test_api_admin_analytics_moderation_efficiency_admin_specific(
  connection: api.IConnection,
): Promise<void> {
  // Create first administrator account
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  // Create second administrator account
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Test filtering by first administrator ID
  const analytics1 =
    await api.functional.discussionBoard.admin.analytics.moderation_efficiency.index(
      adminConnection1,
      {
        body: {
          admin_id: admin1.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(analytics1);
  // Test filtering by second administrator ID
  const analytics2 =
    await api.functional.discussionBoard.admin.analytics.moderation_efficiency.index(
      adminConnection2,
      {
        body: {
          admin_id: admin2.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(analytics2);
  // Test filtering by non-existent admin ID (should return empty or error)
  await TestValidator.error(
    "invalid admin ID should handle gracefully",
    async () => {
      await api.functional.discussionBoard.admin.analytics.moderation_efficiency.index(
        adminConnection1,
        {
          body: {
            admin_id: typia.random<string & tags.Format<"uuid">>(),
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardModerationLog.IRequest,
        },
      );
    },
  );
  // Test with comprehensive filtering parameters
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const analyticsWithFilters =
    await api.functional.discussionBoard.admin.analytics.moderation_efficiency.index(
      adminConnection1,
      {
        body: {
          admin_id: admin1.id,
          action_type: "delete_article",
          status: "completed",
          performed_at_from: oneWeekAgo.toISOString(),
          performed_at_to: now.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(analyticsWithFilters);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure present",
    typeof analytics1.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination structure present",
    typeof analytics2.pagination,
    "object",
  );
  TestValidator.equals(
    "filtered pagination present",
    typeof analyticsWithFilters.pagination,
    "object",
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(analytics1.data));
  TestValidator.predicate("data is array", Array.isArray(analytics2.data));
  TestValidator.predicate(
    "filtered data is array",
    Array.isArray(analyticsWithFilters.data),
  );
  // Validate moderation log structure if data exists
  if (analytics1.data.length > 0) {
    const log = analytics1.data[0];
    TestValidator.predicate("log has id", typeof log.id === "string");
    TestValidator.predicate(
      "log has action_type",
      typeof log.action_type === "string",
    );
    TestValidator.predicate(
      "log has action_description",
      typeof log.action_description === "string",
    );
    TestValidator.predicate(
      "log has performed_at",
      typeof log.performed_at === "string",
    );
    TestValidator.predicate("log has status", typeof log.status === "string");
  }
  // Test empty filter (should return all moderation logs)
  const analyticsAll =
    await api.functional.discussionBoard.admin.analytics.moderation_efficiency.index(
      adminConnection1,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(analyticsAll);
  TestValidator.equals(
    "all logs pagination present",
    typeof analyticsAll.pagination,
    "object",
  );
  TestValidator.predicate(
    "all logs data is array",
    Array.isArray(analyticsAll.data),
  );
}

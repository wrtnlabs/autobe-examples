import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_flag_analytics_temporal_trends(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using the available utility function
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
  // Test various date range scenarios for flag analytics
  // Test 1: Recent period (last 7 days)
  const recentStart = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const recentAnalytics =
    await api.functional.discussionBoard.admin.analytics.flags.index(
      adminConnection,
      {
        body: {
          created_at_min: recentStart,
          limit: 50,
          page: 1,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(recentAnalytics);
  // Test 2: Specific status filtering
  const statusAnalytics =
    await api.functional.discussionBoard.admin.analytics.flags.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 20,
          page: 1,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(statusAnalytics);
  // Test 3: Pagination with custom limits
  const paginationAnalytics =
    await api.functional.discussionBoard.admin.analytics.flags.index(
      adminConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(paginationAnalytics);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof paginationAnalytics.pagination,
    "object",
  );
  TestValidator.predicate(
    "has valid current page",
    paginationAnalytics.pagination.current >= 0,
  );
  TestValidator.predicate(
    "has valid limit",
    paginationAnalytics.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "has valid records count",
    paginationAnalytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    paginationAnalytics.pagination.pages >= 0,
  );
  // Validate data array structure if data exists
  if (paginationAnalytics.data.length > 0) {
    const sampleFlag = paginationAnalytics.data[0];
    TestValidator.equals("flag has id", typeof sampleFlag.id, "string");
    TestValidator.equals(
      "flag has reason",
      typeof sampleFlag.flag_reason,
      "string",
    );
    TestValidator.equals("flag has status", typeof sampleFlag.status, "string");
    TestValidator.equals(
      "flag has created_at",
      typeof sampleFlag.created_at,
      "string",
    );
    TestValidator.equals(
      "flag has reporter_user_id",
      typeof sampleFlag.reporter_user_id,
      "string",
    );
  }
  // Test 4: Combined filters
  const combinedAnalytics =
    await api.functional.discussionBoard.admin.analytics.flags.index(
      adminConnection,
      {
        body: {
          created_at_min: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: "resolved",
          limit: 15,
          page: 1,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(combinedAnalytics);
}

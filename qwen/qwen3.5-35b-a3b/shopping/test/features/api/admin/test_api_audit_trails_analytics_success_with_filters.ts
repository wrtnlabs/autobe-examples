import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAuditTrailAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAuditTrailAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAuditTrailAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAuditTrailAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_trails_analytics_success_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular admin account
  const adminAuth = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create admin-specific connection with JWT token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 3. Define analytics request with optional filters
  const analyticsRequest = {
    timeWindow: "week" as const,
    includeTrends: true as const,
    page: 1 as number,
    pageSize: 50 as number,
  } satisfies IEcommerceMallAuditTrailAnalytic.IRequest;
  // 4. Call analytics endpoint
  const response =
    await api.functional.ecommerceMall.admin.audit_trails.analytics(
      adminConnection,
      { body: analyticsRequest },
    );
  typia.assert(response);
  // 5. Validate response has at least one data item
  TestValidator.predicate("response has data items", response.data.length > 0);
  // 6. Get the first analytics record
  const analytics = response.data[0];
  typia.assert(analytics);
  // 7. Validate summary section
  const summary = analytics.summary;
  typia.assert(summary);
  TestValidator.equals("totalLogs is non-negative", summary.totalLogs, 0);
  TestValidator.equals("uniqueAdmins is non-negative", summary.uniqueAdmins, 0);
  TestValidator.equals(
    "uniqueEntities is non-negative",
    summary.uniqueEntities,
    0,
  );
  // 8. Validate actionTypeDistribution is an object with proper structure
  const actionDist = analytics.actionTypeDistribution;
  typia.assert(actionDist);
  TestValidator.predicate(
    "actionTypeDistribution is object",
    typeof actionDist === "object",
  );
  // 9. Validate adminActivity is array with proper structure
  const adminActivity = analytics.adminActivity;
  typia.assert(adminActivity);
  TestValidator.predicate(
    "adminActivity is array",
    Array.isArray(adminActivity),
  );
  // 10. Validate each admin activity has required fields
  if (adminActivity.length > 0) {
    typia.assert(adminActivity[0]);
    const firstActivity = adminActivity[0];
    TestValidator.equals(
      "admin activity has adminId",
      firstActivity.adminId !== undefined,
      true,
    );
    TestValidator.predicate(
      "admin activity has activityCount",
      firstActivity.activityCount > 0,
    );
    TestValidator.predicate(
      "admin activity has firstActivityAt",
      firstActivity.firstActivityAt !== undefined,
    );
    TestValidator.predicate(
      "admin activity has lastActivityAt",
      firstActivity.lastActivityAt !== undefined,
    );
  }
  // 11. Validate targetEntityDistribution is an object with proper structure
  const entityDist = analytics.targetEntityDistribution;
  typia.assert(entityDist);
  TestValidator.predicate(
    "targetEntityDistribution is object",
    typeof entityDist === "object",
  );
  // 12. Validate trends when includeTrends=true
  const trends = analytics.trends;
  typia.assert(trends);
  TestValidator.predicate("trends is array", Array.isArray(trends));
  // 13. Validate trend structure when trends exist
  if (trends.length > 0) {
    typia.assert(trends[0]);
    const firstTrend = trends[0];
    TestValidator.equals(
      "trend has timeWindow",
      firstTrend.timeWindow !== undefined,
      true,
    );
    TestValidator.equals(
      "trend has actionCount",
      firstTrend.actionCount,
      0,
    );
    TestValidator.equals(
      "trend has dateStart",
      firstTrend.dateStart !== undefined,
      true,
    );
    TestValidator.equals(
      "trend has dateEnd",
      firstTrend.dateEnd !== undefined,
      true,
    );
  }
  // 14. Validate pagination metadata
  const pagination = response.pagination;
  typia.assert(pagination);
  TestValidator.equals("current page is >= 1", pagination.current, 1);
  TestValidator.equals("limit is positive", pagination.limit, 1);
  TestValidator.equals("records is non-negative", pagination.records, 0);
  TestValidator.equals("pages is non-negative", pagination.pages, 0);
  // 15. Validate pagination consistency
  const expectedPages =
    pagination.limit > 0 ? Math.ceil(pagination.records / pagination.limit) : 0;
  TestValidator.equals(
    "pages matches calculation",
    pagination.pages,
    expectedPages,
  );
  // 16. Validate dateRange in summary
  const dateRange = summary.dateRange;
  TestValidator.equals(
    "dateRange minDate exists",
    dateRange.minDate !== undefined,
    true,
  );
  TestValidator.equals(
    "dateRange maxDate exists",
    dateRange.maxDate !== undefined,
    true,
  );
}
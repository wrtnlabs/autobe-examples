import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_logs_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Get current timestamp for date range testing
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString();
  const oneWeekAgo = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const oneDayFuture = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();
  // Test 1: Filter by broad date range (last week to now)
  const broadRangeLogs =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          start_date: oneWeekAgo,
          end_date: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(broadRangeLogs);
  // Test 2: Filter by recent date range (last day to now)
  const recentLogs =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          start_date: oneDayAgo,
          end_date: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(recentLogs);
  // Test 3: Filter by future date range (should return empty)
  const futureLogs =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          start_date: oneDayFuture,
          end_date: new Date(
            now.getTime() + 1000 * 60 * 60 * 24 * 2,
          ).toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(futureLogs);
  TestValidator.equals(
    "future date range should return empty",
    futureLogs.data.length,
    0,
  );
  // Test 4: Filter by same start and end date
  const sameDateLogs =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          start_date: oneDayAgo,
          end_date: oneDayAgo,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(sameDateLogs);
  // Test 5: Filter without date range (should return all logs)
  const allLogs = await api.functional.communityPlatform.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAuditLog.IRequest,
    },
  );
  typia.assert(allLogs);
  // Validate that date filtering affects results
  if (broadRangeLogs.data.length > 0 && recentLogs.data.length > 0) {
    TestValidator.predicate(
      "broad range should include recent range results",
      broadRangeLogs.data.length >= recentLogs.data.length,
    );
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid current page",
    allLogs.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    allLogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have valid records count",
    allLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have valid pages count",
    allLogs.pagination.pages >= 0,
  );
  // Test 6: Edge case - very old date range
  const ancientDate = new Date(2000, 0, 1).toISOString();
  const ancientLogs =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          start_date: ancientDate,
          end_date: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(ancientLogs);
}

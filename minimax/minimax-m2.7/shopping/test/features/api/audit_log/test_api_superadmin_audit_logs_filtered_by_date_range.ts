import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import type { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import type { IEcommerceMallSuperAdminAuditLogSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSuperAdminAuditLogSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLogSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_audit_logs_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperAdmin123!@#",
      href: "/test",
      referrer: "https://test.example.com",
    },
  });
  typia.assert(authorized);
  // Set the authorization token from the join response
  const tokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 2. Get all audit logs first to establish baseline and determine date range for filtering
  const allLogsResponse =
    await api.functional.ecommerceMall.superAdmin.superAdmin.audit_logs.index(
      tokenConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(allLogsResponse);
  // 3. Test 1: Date range filtering with ISO 8601 format timestamps
  // If we have logs, use their date range; otherwise use a broad range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fromDate =
    allLogsResponse.data.length > 0
      ? allLogsResponse.data[allLogsResponse.data.length - 1].createdAt
      : thirtyDaysAgo.toISOString();
  const toDate =
    allLogsResponse.data.length > 0
      ? allLogsResponse.data[0].createdAt
      : now.toISOString();
  const dateRangeResponse =
    await api.functional.ecommerceMall.superAdmin.superAdmin.audit_logs.index(
      tokenConnection,
      {
        body: {
          createdAtFrom: fromDate,
          createdAtTo: toDate,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Validate: All returned logs should fall within the date range (inclusive)
  for (const log of dateRangeResponse.data) {
    const logDate = new Date(log.createdAt);
    const from = new Date(fromDate);
    const to = new Date(toDate);
    TestValidator.predicate("log createdAt >= createdAtFrom", logDate >= from);
    TestValidator.predicate("log createdAt <= createdAtTo", logDate <= to);
  }
  // 4. Test 2: Boundary dates are inclusive - test with exact date from existing log
  if (allLogsResponse.data.length > 0) {
    const exactDate = allLogsResponse.data[0].createdAt;
    const boundaryResponse =
      await api.functional.ecommerceMall.superAdmin.superAdmin.audit_logs.index(
        tokenConnection,
        {
          body: {
            createdAtFrom: exactDate,
            createdAtTo: exactDate,
            limit: 20,
            page: 1,
          } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
        },
      );
    typia.assert(boundaryResponse);
    // When filtering with same from/to date, log should be included (inclusive)
    for (const log of boundaryResponse.data) {
      TestValidator.predicate(
        "boundary date inclusive - log matches exact date",
        log.createdAt === exactDate,
      );
    }
  }
  // 5. Test 3: Date range with no matching records returns empty data
  const futureDate = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const furtherFutureDate = new Date(
    now.getTime() + 730 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResponse =
    await api.functional.ecommerceMall.superAdmin.superAdmin.audit_logs.index(
      tokenConnection,
      {
        body: {
          createdAtFrom: futureDate,
          createdAtTo: furtherFutureDate,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty date range returns no records",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination shows 0 records for empty range",
    emptyResponse.pagination.pagination.records,
    0,
  );
  // 6. Test 4: Combining date filter with other filters
  if (allLogsResponse.data.length > 0) {
    // Pick a targetType from existing logs
    const existingLog = allLogsResponse.data.find(
      (log) => log.targetType !== null,
    );
    if (existingLog && existingLog.targetType) {
      const combinedResponse =
        await api.functional.ecommerceMall.superAdmin.superAdmin.audit_logs.index(
          tokenConnection,
          {
            body: {
              createdAtFrom: fromDate,
              createdAtTo: toDate,
              targetType: existingLog.targetType as
                | "admin"
                | "super_admin"
                | "seller"
                | "customer"
                | "product"
                | "order",
              limit: 20,
              page: 1,
            } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
          },
        );
      typia.assert(combinedResponse);
      // All logs should match both date range AND targetType
      for (const log of combinedResponse.data) {
        TestValidator.equals(
          "log targetType matches filter",
          log.targetType,
          existingLog.targetType,
        );
        const logDate = new Date(log.createdAt);
        const from = new Date(fromDate);
        const to = new Date(toDate);
        TestValidator.predicate(
          "log in date range",
          logDate >= from && logDate <= to,
        );
      }
    }
    // Test with action filter combined with date range
    const existingAction = allLogsResponse.data[0].action;
    const actionFilteredResponse =
      await api.functional.ecommerceMall.superAdmin.superAdmin.audit_logs.index(
        tokenConnection,
        {
          body: {
            createdAtFrom: fromDate,
            createdAtTo: toDate,
            action: existingAction,
            limit: 20,
            page: 1,
          } satisfies IEcommerceMallSuperAdminAuditLog.IRequest,
        },
      );
    typia.assert(actionFilteredResponse);
    // All logs should match both date range AND action
    for (const log of actionFilteredResponse.data) {
      TestValidator.equals(
        "log action matches filter",
        log.action,
        existingAction,
      );
    }
  }
  // 7. Test 5: Pagination correctly reflects date-filtered record count
  // Compare record count between filtered and unfiltered results
  if (allLogsResponse.pagination.pagination.records > 1) {
    TestValidator.predicate(
      "date filtered results have appropriate pagination",
      dateRangeResponse.pagination.pagination.records <=
        allLogsResponse.pagination.pagination.records,
    );
  }
}

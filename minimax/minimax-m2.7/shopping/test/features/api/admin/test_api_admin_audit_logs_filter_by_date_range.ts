import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Store the admin ID for filtering
  const adminId = authorized.id;
  // 2. Record the start time before performing actions
  const beforeActions = new Date();
  // Small delay to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Perform some admin actions to generate audit logs
  // (The actual actions depend on what admin operations are available)
  // For now, we focus on testing the audit log filtering by date range
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Record time after actions
  const afterActions = new Date();
  // 4. Test with wide date range (should include all entries)
  const wideRangeResult =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          created_at_from: new Date(
            beforeActions.getTime() - 60000,
          ).toISOString(),
          created_at_to: new Date(afterActions.getTime() + 60000).toISOString(),
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(wideRangeResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    wideRangeResult.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pagination has valid structure",
    wideRangeResult.pagination.limit > 0 &&
      wideRangeResult.pagination.records >= 0 &&
      wideRangeResult.pagination.pages >= 0,
  );
  // 5. Test with narrow date range (just around the action times)
  const narrowRangeResult =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          created_at_from: beforeActions.toISOString(),
          created_at_to: afterActions.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(narrowRangeResult);
  // 6. Test with same from and to date (single point in time)
  const singlePointResult =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          created_at_from: new Date().toISOString(),
          created_at_to: new Date().toISOString(),
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(singlePointResult);
  // Validate all results have valid structure
  TestValidator.predicate(
    "wide range has data array",
    Array.isArray(wideRangeResult.data),
  );
  TestValidator.predicate(
    "narrow range has data array",
    Array.isArray(narrowRangeResult.data),
  );
  TestValidator.predicate(
    "single point has data array",
    Array.isArray(singlePointResult.data),
  );
  // 7. Test with past date range (should return empty or minimal results)
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 10); // 10 years ago
  const pastRangeResult =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          created_at_from: pastDate.toISOString(),
          created_at_to: new Date(pastDate.getTime() + 1000).toISOString(),
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(pastRangeResult);
  // 8. Test with future date range (should return empty or minimal results)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10); // 10 years from now
  const futureRangeResult =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          created_at_from: futureDate.toISOString(),
          created_at_to: new Date(futureDate.getTime() + 60000).toISOString(),
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(futureRangeResult);
  // 9. Test filtering by admin ID combined with date range
  const adminFilteredResult =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          ecommerce_mall_admin_id: adminId,
          created_at_from: new Date(
            beforeActions.getTime() - 60000,
          ).toISOString(),
          created_at_to: new Date(afterActions.getTime() + 60000).toISOString(),
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(adminFilteredResult);
  // Validate admin ID filter - all returned logs should be from the filtered admin
  for (const log of adminFilteredResult.data) {
    TestValidator.equals("admin ID matches filter", log.admin.id, adminId);
  }
  // 10. Test pagination parameters with date range
  const paginatedResult =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          created_at_from: new Date(0).toISOString(), // Very old date
          created_at_to: new Date().toISOString(), // Now
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "limit is respected",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.equals("page is 1", paginatedResult.pagination.current, 1);
  TestValidator.predicate(
    "data length <= limit",
    paginatedResult.data.length <= 10,
  );
  // 11. Test date range with different page numbers
  if (paginatedResult.pagination.pages > 1) {
    const secondPageResult =
      await api.functional.ecommerceMall.admin.admin.auditLogs.index(
        adminConnection,
        {
          body: {
            created_at_from: new Date(0).toISOString(),
            created_at_to: new Date().toISOString(),
            limit: 10,
            page: 2,
          } satisfies IEcommerceMallAdminAuditLog.IRequest,
        },
      );
    typia.assert(secondPageResult);
    TestValidator.equals(
      "second page current",
      secondPageResult.pagination.current,
      2,
    );
  }
  // 12. Test boundary conditions - date range at system boundaries
  const boundaryFrom = new Date(0);
  const boundaryTo = new Date();
  const boundaryResult =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          created_at_from: boundaryFrom.toISOString(),
          created_at_to: boundaryTo.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(boundaryResult);
  // Validate date range filtering - all entries should have created_at >= created_at_from and <= created_at_to
  for (const log of boundaryResult.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      "log timestamp within boundary range",
      logDate >= boundaryFrom && logDate <= boundaryTo,
    );
  }
  // 13. Test with specific action type combined with date range
  const actionFilteredResult =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          action: "admin_login",
          created_at_from: new Date(0).toISOString(),
          created_at_to: new Date().toISOString(),
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(actionFilteredResult);
  // 14. Test with resource_type filter combined with date range
  const resourceFilteredResult =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          resource_type: "admin",
          created_at_from: new Date(0).toISOString(),
          created_at_to: new Date().toISOString(),
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(resourceFilteredResult);
  // 15. Validate response data structure for each log entry
  for (const log of wideRangeResult.data) {
    // Verify required fields exist
    TestValidator.predicate(
      "log has id",
      log.id !== undefined && log.id !== null,
    );
    TestValidator.predicate(
      "log has admin",
      log.admin !== undefined && log.admin !== null,
    );
    TestValidator.predicate("log has action", log.action !== undefined);
    TestValidator.predicate(
      "log has resource_type",
      log.resource_type !== undefined,
    );
    TestValidator.predicate("log has created_at", log.created_at !== undefined);
  }
}

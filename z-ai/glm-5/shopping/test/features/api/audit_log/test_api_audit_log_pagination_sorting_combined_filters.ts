import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination, sorting, and combined filtering scenarios for audit log retrieval.
 *
 * Setup: Ensure the system has a substantial number of audit log entries across
 * different time periods, action types, and administrators.
 *
 * Test Steps:
 * 1. Test default pagination behavior - call without page/limit parameters and verify defaults
 * 2. Test maximum limit enforcement - set limit to 100 and verify it works
 * 3. Test pagination navigation - request page 1, then page 2, verify different records
 * 4. Test empty results - filter with criteria that match no records, verify empty data array
 * 5. Test sorting - verify multiple pages maintain descending created_at order
 * 6. Test combined filters - use action type AND target_type AND date range together
 * 7. Test limit boundary conditions - verify limit=1 returns single record
 * 8. Test that all request parameters are optional - call with empty request body
 * 9. Verify response structure: pagination object and data array with proper types
 */
export async function test_api_audit_log_pagination_sorting_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin connection for authenticated access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Test 1: Default pagination behavior - call without page/limit parameters
  const defaultResult =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: {} satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default pagination should have valid pagination object",
    defaultResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination should have limit >= 1",
    defaultResult.pagination.limit >= 1,
  );
  // Test 2: Maximum limit enforcement - set limit to 100 (maximum allowed)
  const maxLimitResult =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: { limit: 100 } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "maximum limit should be respected",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "returned data should not exceed limit",
    maxLimitResult.data.length <= 100,
  );
  // Test 3: Pagination navigation - page 1 vs page 2
  const page1Result = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: { page: 1, limit: 5 } satisfies IShoppingMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(page1Result);
  if (page1Result.pagination.pages >= 2) {
    const page2Result =
      await api.functional.shoppingMall.admin.audit_logs.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 5,
          } satisfies IShoppingMallAdminAuditLog.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page numbers should differ",
      page1Result.pagination.current,
      1,
    );
    TestValidator.equals(
      "page 2 current should be 2",
      page2Result.pagination.current,
      2,
    );
    // Verify different records on different pages (if data exists)
    if (page1Result.data.length > 0 && page2Result.data.length > 0) {
      TestValidator.notEquals(
        "different pages should have different records",
        page1Result.data[0].id,
        page2Result.data[0].id,
      );
    }
  }
  // Test 4: Empty results - filter with non-existent target_id
  const nonExistentId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  const emptyResult = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        target_id: nonExistentId,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty filter should return empty data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter should have zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter should have zero pages",
    emptyResult.pagination.pages,
    0,
  );
  // Test 5: Sorting - verify descending created_at order across multiple pages
  const sortTestResult =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: { limit: 20 } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(sortTestResult);
  // Verify descending order by created_at
  for (let i = 0; i < sortTestResult.data.length - 1; i++) {
    const currentCreatedAt = new Date(
      sortTestResult.data[i].created_at,
    ).getTime();
    const nextCreatedAt = new Date(
      sortTestResult.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate(
      "results should be sorted by created_at descending",
      currentCreatedAt >= nextCreatedAt,
    );
  }
  // Test 6: Combined filters - action type AND target_type AND date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const combinedFilterResult =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: {
        action: "seller_approve",
        target_type: "seller",
        created_from: oneWeekAgo.toISOString(),
        created_to: now.toISOString(),
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(combinedFilterResult);
  // Verify all results match the combined filter criteria
  for (const log of combinedFilterResult.data) {
    TestValidator.equals(
      "combined filter - action should match",
      log.action,
      "seller_approve",
    );
    TestValidator.equals(
      "combined filter - target_type should match",
      log.target_type,
      "seller",
    );
    const logCreatedAt = new Date(log.created_at).getTime();
    TestValidator.predicate(
      "combined filter - created_at should be within date range",
      logCreatedAt >= oneWeekAgo.getTime() && logCreatedAt <= now.getTime(),
    );
  }
  // Test 7: Limit boundary conditions - limit=1
  const singleRecordResult =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: { limit: 1 } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(singleRecordResult);
  TestValidator.equals(
    "limit=1 should return at most 1 record",
    singleRecordResult.data.length,
    Math.min(1, singleRecordResult.pagination.records),
  );
  TestValidator.equals(
    "limit should be 1",
    singleRecordResult.pagination.limit,
    1,
  );
  // Test 8: All request parameters are optional - empty request body
  const emptyBodyResult =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: {} satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(emptyBodyResult);
  TestValidator.predicate(
    "empty request should return results",
    emptyBodyResult.pagination.records >= 0,
  );
  // Test 9: Verify response structure
  const structureTestResult =
    await api.functional.shoppingMall.admin.audit_logs.index(adminConnection, {
      body: { limit: 10 } satisfies IShoppingMallAdminAuditLog.IRequest,
    });
  typia.assert(structureTestResult);
  // Validate pagination object structure
  TestValidator.predicate(
    "pagination.current should be a number",
    typeof structureTestResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination.limit should be a number",
    typeof structureTestResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination.records should be a number",
    typeof structureTestResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination.pages should be a number",
    typeof structureTestResult.pagination.pages === "number",
  );
  // Validate data array structure
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(structureTestResult.data),
  );
  // Validate individual audit log structure if data exists
  if (structureTestResult.data.length > 0) {
    const firstLog = structureTestResult.data[0];
    TestValidator.predicate(
      "audit log should have id (UUID format)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstLog.id,
      ),
    );
    TestValidator.predicate(
      "audit log should have action",
      typeof firstLog.action === "string",
    );
    TestValidator.predicate(
      "audit log should have target_type",
      typeof firstLog.target_type === "string",
    );
    TestValidator.predicate(
      "audit log should have ip",
      typeof firstLog.ip === "string",
    );
    TestValidator.predicate(
      "audit log should have created_at (date-time format)",
      typeof firstLog.created_at === "string",
    );
    TestValidator.predicate(
      "audit log should have admin object",
      typeof firstLog.admin === "object" && firstLog.admin !== null,
    );
    TestValidator.predicate(
      "admin should have id (UUID format)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstLog.admin.id,
      ),
    );
    TestValidator.predicate(
      "admin should have email",
      typeof firstLog.admin.email === "string",
    );
    TestValidator.predicate(
      "admin should have name",
      typeof firstLog.admin.name === "string",
    );
    TestValidator.predicate(
      "admin should have grade",
      typeof firstLog.admin.grade === "string",
    );
  }
}

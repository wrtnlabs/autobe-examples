import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator audit logs filtering by date range and text search capabilities.
 *
 * Validates the audit log query functionality including date range filtering (created_at_from, created_at_to) and text search on action details. Ensures that administrators can effectively filter and search through the immutable audit trail of administrative actions.
 *
 * The test verifies that date range filters work correctly both individually and in combination, and that text search performs fuzzy matching on action details. All responses are validated using typia runtime type checking.
 *
 * 1. Administrator account is created and authenticated.
 * 2. Query audit logs with created_at_from filter (7 days ago).
 * 3. Verify all returned entries have createdAt >= specified timestamp.
 * 4. Query with created_at_to filter (current time).
 * 5. Verify all returned entries have createdAt <= specified timestamp.
 * 6. Query with combined date range filters.
 * 7. Verify all entries fall within the specified date window.
 * 8. Query with text search parameter.
 * 9. Verify pagination structure and metadata correctness.
 */
export async function test_api_admin_audit_logs_date_range_and_text_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test created_at_from filter (7 days ago)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fromTimestamp = sevenDaysAgo.toISOString();
  const logsFrom =
    await api.functional.shoppingMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          created_at_from: fromTimestamp,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(logsFrom);
  // 3. Verify all entries have createdAt >= fromTimestamp
  TestValidator.predicate("all entries after from timestamp", () =>
    logsFrom.data.every(
      (log) =>
        new Date(log.createdAt).getTime() >= new Date(fromTimestamp).getTime(),
    ),
  );
  // 4. Test created_at_to filter (current time)
  const now = new Date().toISOString();
  const logsTo = await api.functional.shoppingMall.admin.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        created_at_to: now,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(logsTo);
  // 5. Verify all entries have createdAt <= toTimestamp
  TestValidator.predicate("all entries before to timestamp", () =>
    logsTo.data.every(
      (log) => new Date(log.createdAt).getTime() <= new Date(now).getTime(),
    ),
  );
  // 6. Test combined date range filter
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);
  const from24h = twentyFourHoursAgo.toISOString();
  const logsRange =
    await api.functional.shoppingMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          created_at_from: from24h,
          created_at_to: now,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(logsRange);
  // 7. Verify all entries fall within the date range
  TestValidator.predicate("all entries within date range", () =>
    logsRange.data.every(
      (log) =>
        new Date(log.createdAt).getTime() >= new Date(from24h).getTime() &&
        new Date(log.createdAt).getTime() <= new Date(now).getTime(),
    ),
  );
  // 8. Test text search parameter
  const searchLogs =
    await api.functional.shoppingMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          search: "admin",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(searchLogs);
  // 9. Verify pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    () =>
      searchLogs.pagination.current >= 1 &&
      searchLogs.pagination.limit >= 1 &&
      searchLogs.pagination.limit <= 100 &&
      searchLogs.pagination.records >= 0 &&
      searchLogs.pagination.pages >= 0,
  );
  // 10. Verify data array structure
  TestValidator.predicate("data is array", () =>
    Array.isArray(searchLogs.data),
  );
  // 11. Test with action_type filter
  const actionTypeLogs =
    await api.functional.shoppingMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action_type: "create",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(actionTypeLogs);
  // 12. Verify action type filtering
  TestValidator.predicate("action type filter works", () =>
    actionTypeLogs.data.every((log) => log.actionType === "create"),
  );
  // 13. Test with target_entity_type filter
  const entityTypeLogs =
    await api.functional.shoppingMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          target_entity_type: "seller",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(entityTypeLogs);
  // 14. Verify target entity type filtering
  TestValidator.predicate("target entity type filter works", () =>
    entityTypeLogs.data.every((log) => log.targetEntityType === "seller"),
  );
}

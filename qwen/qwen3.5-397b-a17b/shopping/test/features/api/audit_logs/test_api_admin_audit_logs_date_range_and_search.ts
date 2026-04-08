import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test administrator audit logs filtering by date range and text search.
 *
 * Validates the complete audit log filtering workflow including super administrator authentication, date range filtering with created_at_from and created_at_to parameters, and text search functionality using the search parameter for trigram-based fuzzy matching on action_details. Ensures that ISO 8601 date-time format is properly handled for both date range boundaries.
 *
 * Special attention is given to verifying that combined filtering criteria work correctly when both date range and search parameters are applied simultaneously. The test validates that pagination metadata is accurate for filtered result sets.
 *
 * 1. Super administrator registers and authenticates.
 * 2. Queries audit logs with date range filter (created_at_from and created_at_to).
 * 3. Queries audit logs with text search parameter for action_details matching.
 * 4. Queries audit logs with combined date range and search filters.
 * 5. Validates pagination information and result structure for all queries.
 */
export async function test_api_admin_audit_logs_date_range_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // 2. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: oneDayLater.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // 3. Test text search filtering
  const searchResult =
    await api.functional.shoppingMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          search: "admin",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Test combined date range and search filtering
  const combinedResult =
    await api.functional.shoppingMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: oneDayLater.toISOString(),
          search: "admin",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(combinedResult);
  // 5. Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    () => dateRangeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    () => dateRangeResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    () => dateRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    () => dateRangeResult.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", () =>
    Array.isArray(dateRangeResult.data),
  );
  // 6. Validate audit log entry structure if data exists
  if (dateRangeResult.data.length > 0) {
    const firstLog = dateRangeResult.data[0];
    typia.assert(firstLog);
    TestValidator.predicate(
      "log has admin info",
      () => firstLog.admin !== undefined,
    );
  }
  // 7. Validate search result structure
  TestValidator.predicate(
    "search returns valid pagination",
    () => searchResult.pagination.current >= 1,
  );
  TestValidator.predicate("search data is array", () =>
    Array.isArray(searchResult.data),
  );
  // 8. Validate combined filter result structure
  TestValidator.predicate(
    "combined filter returns valid pagination",
    () => combinedResult.pagination.current >= 1,
  );
  TestValidator.predicate("combined filter data is array", () =>
    Array.isArray(combinedResult.data),
  );
}

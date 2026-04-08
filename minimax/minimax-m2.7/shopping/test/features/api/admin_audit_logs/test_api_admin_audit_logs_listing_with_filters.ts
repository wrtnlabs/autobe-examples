import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_audit_logs_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Query audit logs with multiple filters applied
  // Test filtering by action type, resource type, and sorting
  const actionTypes = [
    "approve_seller",
    "suspend_user",
    "delete_product",
    "update_category",
  ];
  const resourceTypes = ["seller", "product", "order", "customer"];
  const filteredLogs =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action: actionTypes[0],
          resourceType: resourceTypes[0],
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(filteredLogs);
  // 3. Validate pagination metadata
  const filteredPagination = filteredLogs.pagination as unknown as {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  TestValidator.equals(
    "pagination page",
    filteredPagination.page,
    1,
  );
  TestValidator.predicate(
    "pagination per_page valid",
    filteredPagination.per_page > 0,
  );
  TestValidator.predicate(
    "pagination total >= 0",
    filteredPagination.total >= 0,
  );
  TestValidator.predicate(
    "pagination total_pages >= 0",
    filteredPagination.total_pages >= 0,
  );
  // 4. Validate each audit log entry structure
  for (const log of filteredLogs.data) {
    // If we have matching logs, verify structure
    TestValidator.equals("id format", log.id.substring(0, 14), "00000000-0000");
    TestValidator.predicate("action is string", typeof log.action === "string");
    TestValidator.predicate(
      "resourceType is string",
      typeof log.resourceType === "string",
    );
    TestValidator.equals(
      "resourceId format",
      log.resourceId.substring(0, 14),
      "00000000-0000",
    );
    TestValidator.predicate(
      "ipAddress is string",
      typeof log.ipAddress === "string",
    );
    TestValidator.predicate(
      "createdAt is date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(log.createdAt),
    );
    // Validate admin structure
    TestValidator.equals(
      "admin id format",
      log.admin.id.substring(0, 14),
      "00000000-0000",
    );
    TestValidator.predicate(
      "admin email is string",
      typeof log.admin.email === "string",
    );
    TestValidator.predicate(
      "admin name is string",
      typeof log.admin.name === "string",
    );
    TestValidator.predicate(
      "admin is_super_admin is boolean",
      typeof log.admin.is_super_admin === "boolean",
    );
  }
  // 5. Test with date range filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilteredLogs =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: thirtyDaysAgo.toISOString(),
          createdAtTo: now.toISOString(),
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(dateFilteredLogs);
  // 6. Test with all filters combined
  const allFiltersLogs =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action: "approve_seller",
          resourceType: "seller",
          sortBy: "createdAt",
          sortOrder: "asc",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(allFiltersLogs);
  // 7. Verify all returned logs match the filter criteria (if any logs returned)
  if (allFiltersLogs.data.length > 0) {
    for (const log of allFiltersLogs.data) {
      TestValidator.equals(
        "action matches filter",
        log.action,
        "approve_seller",
      );
      TestValidator.equals(
        "resourceType matches filter",
        log.resourceType,
        "seller",
      );
    }
  }
  // 8. Test pagination
  const paginatedLogs =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);
  const paginatedPagination = paginatedLogs.pagination as unknown as {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  TestValidator.equals(
    "per_page set correctly",
    paginatedPagination.per_page,
    5,
  );
}
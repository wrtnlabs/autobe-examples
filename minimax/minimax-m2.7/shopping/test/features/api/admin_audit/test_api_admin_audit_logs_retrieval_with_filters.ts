import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account via admin request
  const joinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(joinConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // Step 2: Login as admin (using password from test environment config)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: "Qwerty1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Step 3: Test basic audit logs retrieval with default filters
  const defaultLogs =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(defaultLogs);
  // Validate pagination structure exists
  TestValidator.equals(
    "pagination exists",
    defaultLogs.pagination !== null && defaultLogs.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(defaultLogs.data),
    true,
  );
  // Step 4: Test retrieval with action type filter
  const actionFilteredLogs =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action: "approve_seller",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(actionFilteredLogs);
  // Step 5: Test retrieval with resource type filter
  const resourceFilteredLogs =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          resourceType: "seller",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(resourceFilteredLogs);
  // Step 6: Test retrieval with date range filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilteredLogs =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          createdAtFrom: thirtyDaysAgo.toISOString(),
          createdAtTo: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(dateFilteredLogs);
  // Validate date range filter works - all entries should be within range
  for (const log of dateFilteredLogs.data) {
    const logDate = new Date(log.createdAt);
    TestValidator.predicate(
      "log date is within range",
      logDate >= thirtyDaysAgo && logDate <= now,
    );
  }
  // Step 7: Test combined filters
  const combinedFilteredLogs =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action: "approve_seller",
          resourceType: "seller",
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(combinedFilteredLogs);
  // Step 8: Test sorting - verify results are sorted by createdAt descending (newest first)
  if (combinedFilteredLogs.data.length > 1) {
    for (let i = 0; i < combinedFilteredLogs.data.length - 1; i++) {
      const current = new Date(combinedFilteredLogs.data[i].createdAt);
      const next = new Date(combinedFilteredLogs.data[i + 1].createdAt);
      TestValidator.predicate(
        "logs sorted newest first",
        current.getTime() >= next.getTime(),
      );
    }
  }
  // Step 9: Validate audit log entry structure
  if (defaultLogs.data.length > 0) {
    const sampleLog = defaultLogs.data[0];
    // Validate required fields exist and have correct types
    TestValidator.equals("id is uuid format", sampleLog.id !== null, true);
    TestValidator.equals("action is string", typeof sampleLog.action, "string");
    TestValidator.equals(
      "resourceType is string",
      typeof sampleLog.resourceType,
      "string",
    );
    TestValidator.equals(
      "resourceId is uuid format",
      sampleLog.resourceId !== null,
      true,
    );
    TestValidator.equals(
      "ipAddress is string",
      typeof sampleLog.ipAddress,
      "string",
    );
    TestValidator.equals(
      "createdAt is date-time",
      sampleLog.createdAt !== null,
      true,
    );
    // Validate nested admin structure
    TestValidator.equals("admin exists", sampleLog.admin !== null, true);
    TestValidator.equals("admin id is uuid", sampleLog.admin.id !== null, true);
    TestValidator.equals(
      "admin email is string",
      typeof sampleLog.admin.email,
      "string",
    );
    TestValidator.equals(
      "admin name is string",
      typeof sampleLog.admin.name,
      "string",
    );
    TestValidator.equals(
      "is_super_admin is boolean",
      typeof sampleLog.admin.is_super_admin,
      "boolean",
    );
  }
  // Step 10: Test pagination with specific page and limit
  const paginatedLogs =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);
  TestValidator.equals(
    "page 2 pagination exists",
    paginatedLogs.pagination !== null && paginatedLogs.pagination !== undefined,
    true,
  );
  // Step 11: Test ascending sort order
  const ascendingLogs =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(ascendingLogs);
  // Validate ascending sort - oldest first
  if (ascendingLogs.data.length > 1) {
    for (let i = 0; i < ascendingLogs.data.length - 1; i++) {
      const current = new Date(ascendingLogs.data[i].createdAt);
      const next = new Date(ascendingLogs.data[i + 1].createdAt);
      TestValidator.predicate(
        "ascending sort - older dates first",
        current.getTime() <= next.getTime(),
      );
    }
  }
}
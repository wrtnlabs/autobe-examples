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

/**
 * Test administrator audit logs filtered query functionality.
 *
 * 1. Admin authenticates using authorize_admin_join utility
 * 2. Query audit logs with filters for action types ('approve_seller', 'suspend_user')
 * 3. Filter by resource types ('seller', 'product')
 * 4. Set date range (30 days ago to now)
 * 5. Verify paginated response structure and metadata
 * 6. Validate response contains proper pagination and data array
 */
export async function test_api_admin_audit_logs_filtered_query(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection (Connection Isolation Pattern)
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin (use utility function when available)
  await authorize_admin_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Prepare date range (30 days ago to now)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Construct filtered query request
  const requestBody = {
    adminId: null,
    actionTypes: ["approve_seller", "suspend_user"],
    resourceTypes: ["seller", "product"],
    resourceId: null,
    ipAddress: null,
    dateFrom: thirtyDaysAgo.toISOString(),
    dateTo: now.toISOString(),
    createdAt: null,
    id: null,
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallAdminAuditLog.IRequest;
  // Execute filtered audit logs query
  const response = await api.functional.ecommerceMall.admin.audit_logs.index(
    adminConnection,
    { body: requestBody },
  );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Business logic: pagination consistency check
  TestValidator.predicate(
    "pages calculation valid",
    response.pagination.records === 0
      ? response.pagination.pages === 0
      : response.pagination.pages ===
          Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // If data exists, verify it's an array (typia already validated structure)
  if (response.data.length > 0) {
    TestValidator.predicate(
      "data length does not exceed limit",
      response.data.length <= response.pagination.limit,
    );
  }
}

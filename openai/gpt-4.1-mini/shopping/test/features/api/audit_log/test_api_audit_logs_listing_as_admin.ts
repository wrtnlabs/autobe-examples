import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";

/**
 * Validate administrative audit log listing and filtering.
 *
 * This test begins by registering a new administrator account via the
 * `auth/admin/join` endpoint, asserting successful authentication and receipt
 * of JWT tokens. It then performs a PATCH request to the
 * `/shoppingMall/admin/auditLogs` endpoint, passing various filter criteria
 * including pagination page, limit, search string, admin_id, entity_id, action
 * keywords, and timestamp ranges.
 *
 * The test verifies the response structure, confirming that pagination metadata
 * (current page, limit, total records, total pages) is consistent and
 * reasonable. It assures that audit log entries include expected properties
 * such as id, timestamps, actions, and correct admin_id references when
 * filtering.
 *
 * The test does not attempt unauthorized data access but verifies that only
 * appropriate data related to the authenticated admin is included. It also
 * validates format constraints including UUID formats and ISO date strings,
 * matching the backend's strict data contracts.
 */
export async function test_api_audit_logs_listing_as_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and login
  const adminCreateBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Prepare audit log query with filters and pagination
  const auditLogQueryBody = {
    page: 1,
    limit: 20,
    search: RandomGenerator.substring("Performed"),
    admin_id: admin.id,
    entity_id: typia.random<string & tags.Format<"uuid">>(),
    action: "login",
    timestamp_before: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    timestamp_after: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  } satisfies IShoppingMallAuditLog.IRequest;

  const logsPage: IPageIShoppingMallAuditLog =
    await api.functional.shoppingMall.admin.auditLogs.indexAuditLogs(
      connection,
      { body: auditLogQueryBody },
    );
  typia.assert(logsPage);

  const pagination = logsPage.pagination;

  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate("pagination pages is >= 1", pagination.pages >= 1);
  TestValidator.predicate(
    "pagination records is >= 0",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "audit log data is array",
    Array.isArray(logsPage.data),
  );

  for (const log of logsPage.data) {
    typia.assert<IShoppingMallAuditLog>(log);

    TestValidator.predicate(
      "audit log id is UUID format",
      typeof log.id === "string",
    );
    TestValidator.predicate(
      "audit log timestamp is ISO date",
      typeof log.timestamp === "string" &&
        !isNaN(new Date(log.timestamp).getTime()),
    );

    // Check that audit logs conform to the filters
    if (log.admin_id !== null && log.admin_id !== undefined) {
      TestValidator.equals(
        "audit log admin_id matches filter",
        log.admin_id,
        admin.id,
      );
    }

    if (auditLogQueryBody.entity_id !== undefined) {
      TestValidator.equals(
        "audit log entity_id matches filter",
        log.entity_id,
        auditLogQueryBody.entity_id,
      );
    }

    if (auditLogQueryBody.action !== undefined) {
      TestValidator.predicate(
        "audit log action contains filter",
        typeof log.action === "string" &&
          log.action.includes(auditLogQueryBody.action),
      );
    }

    TestValidator.predicate(
      "audit log timestamp in filter range",
      log.timestamp >= auditLogQueryBody.timestamp_after &&
        log.timestamp <= auditLogQueryBody.timestamp_before,
    );
  }
}

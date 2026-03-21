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
 * Test that an administrator can filter admin audit logs by action type
 * to view specific categories of administrative actions.
 *
 * Steps:
 * 1. Authenticate as admin using POST /ecommerceMall/auth/admin/join
 * 2. Create a seller account and approve it using the seller approval endpoint
 *    to generate an audit log entry with action type 'approve_seller'
 * 3. Call PATCH /ecommerceMall/admin/admin/auditLogs with request body
 *    specifying action filter set to 'approve_seller'
 * 4. Validate response returns HTTP 200 with paginated results
 * 5. Verify all returned audit log entries have action field equal to 'approve_seller'
 * 6. Verify the filtered results still include proper admin and resource information
 * 7. Test filtering by other action types like 'delete_product', 'suspend_user',
 *    'update_category'
 * 8. Test combining action filter with pagination to verify filtering works
 *    correctly across pages
 * 9. Test filtering with non-existent action type returns empty data array
 *    with pagination showing zero records
 */
export async function test_api_admin_audit_logs_filter_by_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Filter audit logs by 'approve_seller' action
  // First, get all audit logs to see available action types
  const allLogsResponse =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(allLogsResponse);
  // 3. Filter by action 'approve_seller'
  const approveSellerLogs =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          action: "approve_seller",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(approveSellerLogs);
  // Validate response structure
  TestValidator.equals(
    "has pagination",
    approveSellerLogs.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(approveSellerLogs.data),
    true,
  );
  // 4. Verify all returned audit log entries have action field equal to 'approve_seller'
  for (const log of approveSellerLogs.data) {
    TestValidator.equals(
      "action field equals approve_seller",
      log.action,
      "approve_seller",
    );
    // Verify each log has proper admin and resource information
    TestValidator.equals("has admin info", log.admin !== null, true);
    TestValidator.equals(
      "has resource_type",
      log.resource_type !== undefined,
      true,
    );
  }
  // 5. Test filtering by other action types
  const deleteProductLogs =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          action: "delete_product",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(deleteProductLogs);
  // Verify all results have 'delete_product' action
  for (const log of deleteProductLogs.data) {
    TestValidator.equals(
      "action field equals delete_product",
      log.action,
      "delete_product",
    );
  }
  const suspendUserLogs =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          action: "suspend_user",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(suspendUserLogs);
  for (const log of suspendUserLogs.data) {
    TestValidator.equals(
      "action field equals suspend_user",
      log.action,
      "suspend_user",
    );
  }
  const updateCategoryLogs =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          action: "update_category",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(updateCategoryLogs);
  for (const log of updateCategoryLogs.data) {
    TestValidator.equals(
      "action field equals update_category",
      log.action,
      "update_category",
    );
  }
  // 6. Test combining action filter with pagination
  const paginatedLogs =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          action: "approve_seller",
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);
  TestValidator.equals("limit is 5", paginatedLogs.pagination.limit, 5);
  TestValidator.equals(
    "current page is 1",
    paginatedLogs.pagination.current,
    1,
  );
  // Test pagination on page 2
  const page2Logs =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          action: "approve_seller",
          limit: 5,
          page: 2,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(page2Logs);
  TestValidator.equals("page 2 current is 2", page2Logs.pagination.current, 2);
  TestValidator.equals("page 2 limit is 5", page2Logs.pagination.limit, 5);
  // 7. Test filtering with non-existent action type returns empty data array
  const nonExistentActionLogs =
    await api.functional.ecommerceMall.admin.admin.auditLogs.index(
      adminConnection,
      {
        body: {
          action: "non_existent_action_xyz",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(nonExistentActionLogs);
  TestValidator.equals(
    "empty data array",
    nonExistentActionLogs.data.length,
    0,
  );
  TestValidator.equals(
    "zero records",
    nonExistentActionLogs.pagination.records,
    0,
  );
  TestValidator.equals("zero pages", nonExistentActionLogs.pagination.pages, 0);
  // 8. Test combining action filter with other filters (e.g., admin_id)
  if (allLogsResponse.data.length > 0) {
    const adminId = allLogsResponse.data[0].admin.id;
    const filteredByAdminAndAction =
      await api.functional.ecommerceMall.admin.admin.auditLogs.index(
        adminConnection,
        {
          body: {
            action: "approve_seller",
            ecommerce_mall_admin_id: adminId,
            limit: 20,
            page: 1,
          } satisfies IEcommerceMallAdminAuditLog.IRequest,
        },
      );
    typia.assert(filteredByAdminAndAction);
    // Verify all results match both filters
    for (const log of filteredByAdminAndAction.data) {
      TestValidator.equals(
        "action is approve_seller",
        log.action,
        "approve_seller",
      );
      TestValidator.equals("admin_id matches", log.admin.id, adminId);
    }
  }
}

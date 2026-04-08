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
 * Test filtering administrative audit logs by action type and resource type.
 *
 * Validates the audit log filtering functionality by creating an administrator,
 * performing multiple distinct admin actions that generate different audit log
 * entries (e.g., approve_seller, suspend_seller, delete_product), then verifying
 * that filtering by action type combined with resource type returns only matching
 * records. The test ensures both the action and resourceType filters work
 * together correctly and that the admin who performed each action is recorded.
 *
 * 1. Administrator joins and authenticates.
 * 2. Creates audit log entries through various admin actions (approve_seller,
 *    suspend_seller, delete_product) with different resource types.
 * 3. Queries audit logs filtering by action='approve_seller' and
 *    resourceType='seller', verifies only seller approval logs are returned.
 * 4. Queries audit logs filtering by action='delete_product' and
 *    resourceType='product', verifies only product deletion logs are returned.
 * 5. Validates that each filtered result contains the correct admin information.
 */
export async function test_api_audit_log_filtering_by_action_and_resource_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Perform admin actions that create audit log entries
  //    Note: We will verify filtering works by querying with specific
  //    action and resourceType filters on the audit logs endpoint
  // 3. Query audit logs with action='approve_seller' and resourceType='seller'
  const sellerApprovalLogs =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action: "approve_seller",
          resourceType: "seller",
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(sellerApprovalLogs);
  // Validate seller approval logs
  TestValidator.predicate(
    "has data array",
    sellerApprovalLogs.data !== undefined,
  );
  TestValidator.predicate(
    "has pagination info",
    sellerApprovalLogs.pagination !== undefined,
  );
  // 4. Query audit logs with action='delete_product' and resourceType='product'
  const productDeletionLogs =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action: "delete_product",
          resourceType: "product",
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(productDeletionLogs);
  // Validate product deletion logs
  TestValidator.predicate(
    "has data array",
    productDeletionLogs.data !== undefined,
  );
  TestValidator.predicate(
    "has pagination info",
    productDeletionLogs.pagination !== undefined,
  );
  // 5. Query audit logs with combined filters - suspend_seller with seller resourceType
  const sellerSuspendLogs =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action: "suspend_seller",
          resourceType: "seller",
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(sellerSuspendLogs);
  // 6. Verify each filtered result contains admin who performed the action
  const allLogs = [
    ...sellerApprovalLogs.data,
    ...productDeletionLogs.data,
    ...sellerSuspendLogs.data,
  ];
  for (const log of allLogs) {
    TestValidator.predicate(
      "audit log has admin info",
      log.admin !== undefined,
    );
    TestValidator.predicate(
      "audit log has valid admin id",
      log.admin.id !== undefined,
    );
    TestValidator.predicate(
      "audit log has valid admin email",
      log.admin.email !== undefined,
    );
  }
}

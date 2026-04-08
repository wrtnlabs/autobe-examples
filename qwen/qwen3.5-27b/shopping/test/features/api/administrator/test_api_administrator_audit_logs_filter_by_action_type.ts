import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorAuditLog";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator audit logs filtering by action type functionality.
 *
 * Validates that authenticated administrators can filter audit logs by specific action types. Tests multiple action types including approve_seller, reject_seller, ban_customer, and delete_product. Verifies that filtering returns only matching audit log entries with correct pagination metadata. Also tests edge cases with non-existent action types returning empty results.
 *
 * The test ensures that the action_type filter parameter correctly narrows down audit log entries to only those matching the specified administrative action, while maintaining complete audit log information including administrator details and security metadata.
 *
 * 1. Register and authenticate as an administrator
 * 2. Filter audit logs by action_type='approve_seller'
 * 3. Verify all returned entries match the filter
 * 4. Test with action_type='reject_seller'
 * 5. Test with action_type='ban_customer'
 * 6. Test with action_type='delete_product'
 * 7. Test with non-existent action type (expect empty results)
 */
export async function test_api_administrator_audit_logs_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Test filtering by action_type='approve_seller'
  const approveSellerResult =
    await api.functional.shoppingMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          action_type: "approve_seller",
        } satisfies IShoppingMallAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(approveSellerResult);
  // Verify all entries match the filter
  for (const log of approveSellerResult.data) {
    TestValidator.equals(
      "action_type matches approve_seller",
      log.action_type,
      "approve_seller",
    );
  }
  // Verify pagination records matches data length
  TestValidator.equals(
    "pagination records matches data length",
    approveSellerResult.pagination.records,
    approveSellerResult.data.length,
  );
  // 3. Test filtering by action_type='reject_seller'
  const rejectSellerResult =
    await api.functional.shoppingMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          action_type: "reject_seller",
        } satisfies IShoppingMallAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(rejectSellerResult);
  // Verify all entries match the filter
  for (const log of rejectSellerResult.data) {
    TestValidator.equals(
      "action_type matches reject_seller",
      log.action_type,
      "reject_seller",
    );
  }
  // 4. Test filtering by action_type='ban_customer'
  const banCustomerResult =
    await api.functional.shoppingMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          action_type: "ban_customer",
        } satisfies IShoppingMallAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(banCustomerResult);
  // Verify all entries match the filter
  for (const log of banCustomerResult.data) {
    TestValidator.equals(
      "action_type matches ban_customer",
      log.action_type,
      "ban_customer",
    );
  }
  // 5. Test filtering by action_type='delete_product'
  const deleteProductResult =
    await api.functional.shoppingMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          action_type: "delete_product",
        } satisfies IShoppingMallAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(deleteProductResult);
  // Verify all entries match the filter
  for (const log of deleteProductResult.data) {
    TestValidator.equals(
      "action_type matches delete_product",
      log.action_type,
      "delete_product",
    );
  }
  // 6. Test with non-existent action type (should return empty array)
  const nonExistentResult =
    await api.functional.shoppingMall.administrator.audit_logs.index(
      adminConnection,
      {
        body: {
          action_type: "non_existent_action_type_12345",
        } satisfies IShoppingMallAdministratorAuditLog.IRequest,
      },
    );
  typia.assert(nonExistentResult);
  // Verify empty results for non-existent action type
  TestValidator.equals(
    "non-existent action type returns empty data",
    nonExistentResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent action type pagination records is 0",
    nonExistentResult.pagination.records,
    0,
  );
  // 7. Verify audit log structure includes administrator details
  if (approveSellerResult.data.length > 0) {
    const firstLog = approveSellerResult.data[0];
    TestValidator.predicate(
      "audit log has administrator email",
      firstLog.administrator.email !== undefined,
    );
    TestValidator.predicate(
      "audit log has administrator grade",
      firstLog.administrator.grade !== undefined,
    );
    TestValidator.predicate(
      "audit log has ip_address",
      firstLog.ip_address !== undefined,
    );
    TestValidator.predicate(
      "audit log has created_at",
      firstLog.created_at !== undefined,
    );
  }
}

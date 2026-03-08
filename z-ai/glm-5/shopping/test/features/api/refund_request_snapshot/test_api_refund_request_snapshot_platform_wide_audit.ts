import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can retrieve a comprehensive list of all refund request
 * snapshots across the entire platform for oversight and audit purposes.
 *
 * **Setup Steps:**
 * 1. Authenticate as an administrator
 * 2. Query the refund request snapshots list without any filters
 *
 * **Validation Points:**
 * - Response includes pagination metadata (current page, limit, total records, total pages)
 * - Each snapshot contains: id, reason, status, created_at, and parent refundRequest reference
 * - Results are sorted by created_at in descending order (newest first)
 * - Administrator can access snapshots from all sellers and customers (no data isolation)
 * - Snapshot records show the state captured when sellers responded to refund requests
 * - The refundRequest relation includes order item, order, customer, and seller context
 *
 * **Business Rule Verification:**
 * - Administrators have full view access to all RefundRequestSnapshot records regardless of seller or customer ownership
 * - Both regular and super administrators can view all snapshots
 * - Snapshots provide immutable audit trail of all refund request state transitions
 */
export async function test_api_refund_request_snapshot_platform_wide_audit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Query refund request snapshots without filters (platform-wide)
  const request = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallRefundRequestSnapshot.IRequest;
  const result =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      { body: request },
    );
  typia.assert(result);
  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    () => result.pagination !== null,
  );
  TestValidator.predicate(
    "current page valid",
    () => result.pagination.current >= 1,
  );
  TestValidator.predicate("limit valid", () => result.pagination.limit >= 0);
  TestValidator.predicate(
    "records count valid",
    () => result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    () => result.pagination.pages >= 0,
  );
  TestValidator.equals(
    "page matches request",
    request.page,
    result.pagination.current,
  );
  TestValidator.equals(
    "limit matches request",
    request.limit,
    result.pagination.limit,
  );
  // Step 4: Validate data array
  TestValidator.predicate("data is array", () => Array.isArray(result.data));
  // Step 5: If snapshots exist, validate each snapshot structure and audit trail
  if (result.data.length > 0) {
    for (let i = 0; i < result.data.length; i++) {
      const snapshot = result.data[i];
      // Validate snapshot has all required fields
      TestValidator.predicate(
        `snapshot[${i}] has id`,
        () => snapshot.id !== null,
      );
      TestValidator.predicate(
        `snapshot[${i}] has reason`,
        () => snapshot.reason !== null && snapshot.reason.length > 0,
      );
      TestValidator.predicate(
        `snapshot[${i}] has status`,
        () => snapshot.status !== null,
      );
      TestValidator.predicate(
        `snapshot[${i}] has created_at`,
        () => snapshot.created_at !== null,
      );
      // Validate refundRequest reference exists (audit trail context)
      TestValidator.predicate(
        `snapshot[${i}] has refundRequest`,
        () => snapshot.refundRequest !== null,
      );
      // Validate refundRequest contains order context
      const refundRequest = snapshot.refundRequest;
      TestValidator.predicate(
        `snapshot[${i}].refundRequest has id`,
        () => refundRequest.id !== null,
      );
      TestValidator.predicate(
        `snapshot[${i}].refundRequest has orderItem`,
        () => refundRequest.orderItem !== null,
      );
      TestValidator.predicate(
        `snapshot[${i}].refundRequest has order`,
        () => refundRequest.order !== null,
      );
      TestValidator.predicate(
        `snapshot[${i}].refundRequest has customer`,
        () => refundRequest.customer !== null,
      );
      TestValidator.predicate(
        `snapshot[${i}].refundRequest has seller`,
        () => refundRequest.seller !== null,
      );
    }
    // Step 6: Validate descending order by created_at (newest first)
    for (let i = 0; i < result.data.length - 1; i++) {
      const currentCreatedAt = new Date(result.data[i].created_at).getTime();
      const nextCreatedAt = new Date(result.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `snapshots sorted descending by created_at at index ${i}`,
        () => currentCreatedAt >= nextCreatedAt,
      );
    }
  }
}

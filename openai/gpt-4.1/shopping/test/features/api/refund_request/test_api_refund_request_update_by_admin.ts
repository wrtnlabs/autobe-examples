import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * E2E test for updating a refund request's workflow fields by admin.
 *
 * 1. Register a new admin account (POST /auth/admin/join) and obtain credentials.
 * 2. Assume an existing refund request, mimicked by generating a random
 *    IShoppingMallRefundRequest object.
 * 3. The admin sends an update (PUT /shoppingMall/admin/refundRequests/{id})
 *    changing:
 *
 *    - Status (e.g., to "approved" or "rejected")
 *    - Approved_amount (non-null value)
 *    - Admin assignment (adds own admin id to the request)
 * 4. Validate:
 *
 *    - Mutable fields (status, approved_amount, admin) updated as expected
 *    - Immutable fields remain unchanged
 *    - Returned object is valid and contains the correct admin assignment
 *    - All transitions are reflected in updated_at
 */
export async function test_api_refund_request_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Assume an existing refund request record (simulate with random)
  const originalRefund = typia.random<IShoppingMallRefundRequest>();
  typia.assert(originalRefund);

  // 3. Update refund request: Change status, approved_amount, assign admin
  const updateInput = {
    status: RandomGenerator.pick(["approved", "rejected"] as const),
    approved_amount: Math.floor(originalRefund.requested_amount * 0.8),
    shopping_mall_admin_id: admin.id,
  } satisfies IShoppingMallRefundRequest.IUpdate;

  const updatedRefund =
    await api.functional.shoppingMall.admin.refundRequests.update(connection, {
      refundRequestId: originalRefund.id,
      body: updateInput,
    });
  typia.assert(updatedRefund);

  // 4. Validate updated fields
  TestValidator.equals(
    "status should be updated",
    updatedRefund.status,
    updateInput.status,
  );
  TestValidator.equals(
    "approved_amount should be updated",
    updatedRefund.approved_amount,
    updateInput.approved_amount,
  );
  TestValidator.equals(
    "admin assignment should match",
    updatedRefund.admin?.id,
    admin.id,
  );
  // Immutable fields
  TestValidator.equals(
    "order association should remain unchanged",
    updatedRefund.order,
    originalRefund.order,
  );
  TestValidator.equals(
    "customer should remain unchanged",
    updatedRefund.customer,
    originalRefund.customer,
  );
  TestValidator.equals(
    "seller should remain unchanged",
    updatedRefund.seller,
    originalRefund.seller,
  );
  TestValidator.equals(
    "reason should remain unchanged",
    updatedRefund.reason,
    originalRefund.reason,
  );
  TestValidator.equals(
    "requested_amount should remain unchanged",
    updatedRefund.requested_amount,
    originalRefund.requested_amount,
  );
  TestValidator.equals(
    "deleted_at should remain unchanged",
    updatedRefund.deleted_at,
    originalRefund.deleted_at,
  );
  // Confirm updated_at changes
  TestValidator.notEquals(
    "updated_at should be refreshed",
    updatedRefund.updated_at,
    originalRefund.updated_at,
  );
}

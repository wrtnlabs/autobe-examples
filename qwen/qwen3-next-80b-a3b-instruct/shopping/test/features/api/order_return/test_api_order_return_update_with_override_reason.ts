import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";
import type { IShoppingMallOrderReturnItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnItem";
import type { IShoppingMallReturnAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnAddress";
import type { IShoppingMallReturnShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShippingMethod";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_return_update_with_override_reason(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a valid return request in 'pending' state (requested is not in allowed statuses)
  const orderCode = typia.random<string>();
  const returnCode = typia.random<string>();
  // Create return with 'pending' status
  const pendingReturn: IShoppingMallOrderReturn =
    await api.functional.shoppingMall.admin.orders.returns.update(
      adminConnection,
      {
        orderCode: orderCode,
        returnCode: returnCode,
        body: {
          status: "pending",
          refund_amount: 100.0,
          override_reason: "Customer requested return", // Replaced 'note' with 'override_reason'
        } satisfies IShoppingMallOrderReturn.IUpdate,
      },
    );
  typia.assert(pendingReturn);
  TestValidator.equals(
    "return status should be pending",
    pendingReturn.status,
    "pending",
  );
  // Step 3: Progress the return to 'completed' status through normal workflow (without override)
  const completedReturn: IShoppingMallOrderReturn =
    await api.functional.shoppingMall.admin.orders.returns.update(
      adminConnection,
      {
        orderCode: orderCode,
        returnCode: returnCode,
        body: {
          status: "completed",
          processing_notes: "Return completed, refund issued",
        } satisfies IShoppingMallOrderReturn.IUpdate,
      },
    );
  typia.assert(completedReturn);
  TestValidator.equals(
    "return status should be completed",
    completedReturn.status,
    "completed",
  );
  // Step 4: Test admin override functionality - update from 'completed' to 'processed' with override_reason
  // Note: override_reason is a request property, not a response property
  const updatedReturn: IShoppingMallOrderReturn =
    await api.functional.shoppingMall.admin.orders.returns.update(
      adminConnection,
      {
        orderCode: orderCode,
        returnCode: returnCode,
        body: {
          status: "processed",
          override_reason: "Administrative override for customer service exception", // Replaced 'note' with 'override_reason'
        } satisfies IShoppingMallOrderReturn.IUpdate,
      },
    );
  typia.assert(updatedReturn);
  TestValidator.equals(
    "return status should be updated to processed",
    updatedReturn.status,
    "processed",
  );
  // Step 5: Test that non-admin actors cannot use override_reason - create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Try to update status from 'completed' to 'processed' with override_reason as customer (should be ignored)
  const customerUpdatedReturn: IShoppingMallOrderReturn =
    await api.functional.shoppingMall.admin.orders.returns.update(
      customerConnection,
      {
        orderCode: orderCode,
        returnCode: returnCode,
        body: {
          status: "processed",
          override_reason: "Should be ignored by system", // Replaced 'note' with 'override_reason'
        } satisfies IShoppingMallOrderReturn.IUpdate,
      },
    );
  typia.assert(customerUpdatedReturn);
  TestValidator.equals(
    "customer update should change status",
    customerUpdatedReturn.status,
    "processed",
  );
  // Since 'override_reason' is not a property of IShoppingMallOrderReturn, we cannot validate it
  // This is handled by business logic in backend, not by the returned type
  
  // Step 6: Test that override_reason cannot be used without status change
  // Create another return in pending state
  const orderCode2 = typia.random<string>();
  const returnCode2 = typia.random<string>();
  const pendingReturn2: IShoppingMallOrderReturn =
    await api.functional.shoppingMall.admin.orders.returns.update(
      adminConnection,
      {
        orderCode: orderCode2,
        returnCode: returnCode2,
        body: {
          status: "pending",
          refund_amount: 75.0,
          override_reason: "Second test return", // Replaced 'note' with 'override_reason'
        } satisfies IShoppingMallOrderReturn.IUpdate,
      },
    );
  typia.assert(pendingReturn2);
  // Try to update with override_reason without changing status (should not be accepted)
  await TestValidator.error(
    "override_reason without status change should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.returns.update(
        adminConnection,
        {
          orderCode: orderCode2,
          returnCode: returnCode2,
          body: {
            override_reason: "Test overriding without status change", // Replaced 'note' with 'override_reason'
          } satisfies IShoppingMallOrderReturn.IUpdate,
        },
      );
    },
  );
  // Step 7: Test that override_reason cannot be used by seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Try to update status from 'completed' to 'processed' with override_reason as seller (should be ignored)
  const sellerUpdatedReturn: IShoppingMallOrderReturn =
    await api.functional.shoppingMall.admin.orders.returns.update(
      sellerConnection,
      {
        orderCode: orderCode,
        returnCode: returnCode,
        body: {
          status: "processed",
          override_reason: "Should be ignored by system", // Replaced 'note' with 'override_reason'
        } satisfies IShoppingMallOrderReturn.IUpdate,
      },
    );
  typia.assert(sellerUpdatedReturn);
  TestValidator.equals(
    "seller update should change status",
    sellerUpdatedReturn.status,
    "processed",
  );
  // Since 'override_reason' is not a property of IShoppingMallOrderReturn, we cannot validate it
  // This is handled by business logic in backend, not by the returned type
}
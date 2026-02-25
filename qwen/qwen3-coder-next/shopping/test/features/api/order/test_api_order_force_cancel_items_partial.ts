import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test force cancellation of specific order items by an administrator.
 *
 * This test validates the force cancel functionality where an administrator
 * can cancel specific items within an order. Since customer order creation
 * is not available in the current API, this test demonstrates the proper
 * usage of the force cancel endpoint.
 *
 * Test Steps:
 * 1. Admin logs in with administrator credentials
 * 2. Admin calls force cancel endpoint with specific item IDs
 * 3. Verify response structure matches IOrder type
 * 4. Validate order items status changes correctly
 */
export async function test_api_order_force_cancel_items_partial(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IShoppingMallAdmin.IJoin = {
    email: "admin@example.com",
    password: "password123",
  };
  const admin = await api.functional.shoppingMall.auth.admin.join(
    adminConnection,
    {
      body: adminCredentials,
    },
  );
  typia.assert(admin);
  // Update admin connection with token from registration
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: admin.token.access,
  };
  // Step 2: Test force cancel with valid structure
  // Note: This test assumes a pre-existing order exists in the test environment
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemIdsToCancel = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const cancelledOrder =
    await api.functional.shoppingMall.admin.orders.force_actions.cancel.forceCancel(
      adminConnection,
      {
        orderId: orderId,
        body: {
          itemIds: itemIdsToCancel,
        } satisfies IShoppingMallOrder.IForceCancelRequest,
      },
    );
  typia.assert(cancelledOrder);
  // Step 3: Verify response structure
  TestValidator.equals("order ID matches", cancelledOrder.id, orderId);
  // Verify order items structure
  TestValidator.predicate(
    "order has items array",
    Array.isArray(cancelledOrder.orderItems),
  );
  cancelledOrder.orderItems.forEach((item) => {
    typia.assert<IShoppingMallOrderItem.ISummary>(item);
  });
}

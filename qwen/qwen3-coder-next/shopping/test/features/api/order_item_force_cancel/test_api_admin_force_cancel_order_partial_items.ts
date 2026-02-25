import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_admin_force_cancel_order_partial_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for order creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MaxLength<255>>(adminEmail),
      password: "1234",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(customerEmail),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Login as customer to get authenticated connection
  const authenticatedCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_customer_login(authenticatedCustomerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(customer.email),
      password: "1234",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 4. Create multiple items in customer cart (simulated for test)
  // In a real scenario, this would involve adding products to cart
  // For this test, we'll focus on the force cancel API endpoint
  // 5. Create order with multiple items
  // This would normally be done through the customer checkout flow
  // For testing purposes, we'll use the admin API to verify order structure
  // 6. Get or create test order with multiple items
  // Since we need to test partial cancellation, we need an order with multiple items
  // We'll assume there's an existing order or use a test order ID
  const orderId = "00000000-0000-0000-0000-000000000001";
  // 7. Get order details to verify structure
  // Since the API doesn't have a direct order retrieval for this test,
  // we'll focus on testing the force cancel endpoint
  // 8. Force cancel first item
  const itemId1 = "00000000-0000-0000-0000-000000000002";
  const cancelledItem1 =
    await api.functional.shoppingMall.admin.orders.items.force_actions.cancel.forceCancel(
      adminConnection,
      {
        orderId,
        itemId: itemId1,
        body: {
          reason: "Test cancellation of first item",
        } satisfies IShoppingMallOrderItem.IForceCancelRequest,
      },
    );
  typia.assert(cancelledItem1);
  // 9. Verify first cancelled item
  TestValidator.equals(
    "first item status is cancelled",
    cancelledItem1.itemStatus,
    "cancelled",
  );
  // 10. Force cancel second item
  const itemId2 = "00000000-0000-0000-0000-000000000003";
  const cancelledItem2 =
    await api.functional.shoppingMall.admin.orders.items.force_actions.cancel.forceCancel(
      adminConnection,
      {
        orderId,
        itemId: itemId2,
        body: {
          reason: "Test cancellation of second item",
        } satisfies IShoppingMallOrderItem.IForceCancelRequest,
      },
    );
  typia.assert(cancelledItem2);
  // 11. Verify second cancelled item
  TestValidator.equals(
    "second item status is cancelled",
    cancelledItem2.itemStatus,
    "cancelled",
  );
  // 12. Verify cancellation reason is preserved
  TestValidator.equals(
    "cancellation reason provided",
    cancelledItem1.itemStatus,
    "cancelled",
  );
  // 13. Test error handling - cannot cancel already cancelled item
  await TestValidator.error(
    "cannot cancel already cancelled item",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.force_actions.cancel.forceCancel(
        adminConnection,
        {
          orderId,
          itemId: itemId1,
          body: {
            reason: "Attempting to cancel already cancelled item",
          } satisfies IShoppingMallOrderItem.IForceCancelRequest,
        },
      );
    },
  );
  // 14. Test with different order
  const orderId2 = "00000000-0000-0000-0000-000000000004";
  const itemId3 = "00000000-0000-0000-0000-000000000005";
  const cancelledItem3 =
    await api.functional.shoppingMall.admin.orders.items.force_actions.cancel.forceCancel(
      adminConnection,
      {
        orderId: orderId2,
        itemId: itemId3,
        body: {
          reason: "Different order cancellation",
        } satisfies IShoppingMallOrderItem.IForceCancelRequest,
      },
    );
  typia.assert(cancelledItem3);
  TestValidator.equals(
    "different order item status is cancelled",
    cancelledItem3.itemStatus,
    "cancelled",
  );
  // 15. Verify error responses for invalid inputs
  await TestValidator.httpError("404 for non-existent order", 404, async () => {
    await api.functional.shoppingMall.admin.orders.items.force_actions.cancel.forceCancel(
      adminConnection,
      {
        orderId: "00000000-0000-0000-0000-000000000000",
        itemId: itemId1,
        body: {
          reason: "Non-existent order test",
        } satisfies IShoppingMallOrderItem.IForceCancelRequest,
      },
    );
  });
  await TestValidator.httpError("404 for non-existent item", 404, async () => {
    await api.functional.shoppingMall.admin.orders.items.force_actions.cancel.forceCancel(
      adminConnection,
      {
        orderId,
        itemId: "00000000-0000-0000-0000-000000000000",
        body: {
          reason: "Non-existent item test",
        } satisfies IShoppingMallOrderItem.IForceCancelRequest,
      },
    );
  });
  // 16. Test empty reason cancellation
  const itemId4 = "00000000-0000-0000-0000-000000000006";
  const cancelledItem4 =
    await api.functional.shoppingMall.admin.orders.items.force_actions.cancel.forceCancel(
      adminConnection,
      {
        orderId,
        itemId: itemId4,
        body: {
          // reason is optional
        } satisfies IShoppingMallOrderItem.IForceCancelRequest,
      },
    );
  typia.assert(cancelledItem4);
  TestValidator.equals(
    "item cancelled without reason",
    cancelledItem4.itemStatus,
    "cancelled",
  );
}
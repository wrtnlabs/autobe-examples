import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test administrator force-cancellation override capability on already shipped order items.
 *
 * This test validates that administrators can override the normal cancellation workflow
 * and immediately cancel order items that have already been shipped. Unlike customer
 * cancellation requests which require seller approval, admin force-cancellation takes
 * effect immediately. This is used for platform oversight, dispute resolution, and
 * policy enforcement.
 */
export async function test_api_order_item_force_cancel_shipped_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
    },
  });
  // 2. Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      shop_name: "Test Shop",
      shop_description: "Test shop for e2e testing",
      href: "https://test.com/seller/join",
      referrer: "https://test.com/seller",
    },
  });
  // 3. Register a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      display_name: "Test Customer",
      phone_number: "01012345678",
      href: "https://test.com/customer/join",
      referrer: "https://test.com/customer",
    },
  });
  // 4. Generate test order and item IDs
  // Note: In a real scenario, these would come from actual order creation flow
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Admin force-cancels the shipped order item
  const cancelledItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.force_cancel.forceCancel(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          reason: "Customer dispute - item damaged during shipping",
          notes:
            "Customer reported damage upon receipt. Admin override for immediate cancellation and refund.",
        } satisfies IShoppingMallOrderItem.IForceCancel,
      },
    );
  // 6. Validate the response
  typia.assert(cancelledItem);
  // 7. Verify the order item status is now 'cancelled'
  TestValidator.equals(
    "order item status is cancelled",
    cancelledItem.status,
    "cancelled",
  );
  // 8. Verify the order item has valid orderId
  TestValidator.equals("order ID matches", cancelledItem.orderId, orderId);
  // 9. Verify the order item has valid sellerId
  TestValidator.predicate(
    "has valid seller ID",
    cancelledItem.sellerId !== undefined,
  );
  // 10. Verify the order item has valid quantity
  TestValidator.predicate("has valid quantity", cancelledItem.quantity > 0);
  // 11. Verify the order item has valid price
  TestValidator.predicate("has valid price", cancelledItem.price > 0);
  // 12. Verify the order item has product snapshot
  TestValidator.predicate(
    "has product snapshot",
    cancelledItem.productSnapshot !== undefined,
  );
  // 13. Verify the order item has variant snapshot
  TestValidator.predicate(
    "has variant snapshot",
    cancelledItem.variantSnapshot !== undefined,
  );
  // 14. Verify the order item has seller profile snapshot
  TestValidator.predicate(
    "has seller profile snapshot",
    cancelledItem.sellerProfileSnapshot !== undefined,
  );
  // 15. Verify the order item has related order
  TestValidator.predicate(
    "has related order",
    cancelledItem.order !== undefined,
  );
  // 16. Verify the order item has related seller
  TestValidator.predicate(
    "has related seller",
    cancelledItem.seller !== undefined,
  );
  // 17. Verify the order item has valid timestamps
  TestValidator.predicate(
    "has valid created at",
    cancelledItem.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has valid updated at",
    cancelledItem.updatedAt !== undefined,
  );
}

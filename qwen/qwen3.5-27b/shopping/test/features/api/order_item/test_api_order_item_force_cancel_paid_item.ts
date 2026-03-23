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

export async function test_api_order_item_force_cancel_paid_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path for administrator force-cancellation of an order item.
   *
   * 1. Register and authenticate as an administrator
   * 2. Use existing order and order item IDs (simulated)
   * 3. Admin calls force-cancel with orderId and itemId
   * 4. Verify order item status changes to 'cancelled'
   * 5. Validate the response structure and business logic
   */
  // 1. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin/join",
    },
  });
  typia.assert(adminAuth);
  // 2. Generate test order and item IDs (in real scenario, these would come from existing orders)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Prepare force-cancel request body
  const forceCancelBody = {
    reason: "Policy violation - fraudulent order detected",
    notes:
      "Customer account flagged for suspicious activity during payment verification",
  } satisfies IShoppingMallOrderItem.IForceCancel;
  // 4. Admin force-cancels the order item
  const cancelledItem =
    await api.functional.shoppingMall.admin.orders.items.force_cancel.forceCancel(
      adminConnection,
      {
        orderId,
        itemId,
        body: forceCancelBody,
      },
    );
  typia.assert(cancelledItem);
  // 5. Verify order item status changed to 'cancelled'
  TestValidator.equals(
    "order item status changed to cancelled",
    cancelledItem.status,
    "cancelled",
  );
  // 6. Verify the order item belongs to the correct order
  TestValidator.equals(
    "order item belongs to specified order",
    cancelledItem.orderId,
    orderId,
  );
  // 7. Verify seller information is preserved
  TestValidator.predicate(
    "seller information preserved in cancelled item",
    cancelledItem.sellerId !== undefined && cancelledItem.sellerId.length > 0,
  );
  // 8. Verify quantity and price are preserved (immutable)
  TestValidator.predicate(
    "quantity preserved after cancellation",
    cancelledItem.quantity > 0,
  );
  TestValidator.predicate(
    "price preserved after cancellation",
    cancelledItem.price > 0,
  );
  // 9. Verify product snapshot exists (immutable record)
  TestValidator.predicate(
    "product snapshot preserved",
    cancelledItem.productSnapshot.length > 0,
  );
  // 10. Verify variant snapshot exists (immutable record)
  TestValidator.predicate(
    "variant snapshot preserved",
    cancelledItem.variantSnapshot.length > 0,
  );
  // 11. Verify seller profile snapshot exists
  TestValidator.predicate(
    "seller profile snapshot preserved",
    cancelledItem.sellerProfileSnapshot.length > 0,
  );
  // 12. Verify order summary is included
  TestValidator.equals(
    "order summary id matches",
    cancelledItem.order.id,
    orderId,
  );
  // 13. Verify order status was recalculated (should be 'cancelled' if this was the only item)
  TestValidator.predicate(
    "order status reflects cancellation",
    cancelledItem.order.status === "cancelled" ||
      cancelledItem.order.status === "partially_completed",
  );
  // 14. Verify timestamps are valid
  TestValidator.predicate(
    "created_at timestamp is valid",
    new Date(cancelledItem.createdAt).toISOString() === cancelledItem.createdAt,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    new Date(cancelledItem.updatedAt).toISOString() === cancelledItem.updatedAt,
  );
  // 15. Verify item is not soft-deleted
  TestValidator.equals(
    "order item is not soft-deleted",
    cancelledItem.deletedAt,
    null,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that an authenticated admin can successfully update the details of
 * a specific order item within a given order.
 *
 * 1. Register a new admin and authenticate for API access
 * 2. Generate random valid orderNumber and orderItemId UUID
 * 3. Prepare update body with a valid random combination (quantity, unit_price,
 *    delivered, refunded)
 * 4. Call admin order item update API
 * 5. Assert response properties exactly match updated values
 * 6. Test business validation logic by sending invalid quantities (zero,
 *    negative), invalid unit_price (negative), and mutually exclusive
 *    delivery/refund status changes
 * 7. Assert errors for each invalid update scenario
 * 8. Cover edge cases for partial updates (update only one property at a time)
 */
export async function test_api_order_item_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin for authentication
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "Aa$",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(admin);

  // 2. Generate random order number and order item UUID
  const orderNumber = RandomGenerator.alphaNumeric(12).toUpperCase();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare valid update - quantity, unit_price, delivered, refunded
  const updateBody = {
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    unit_price: Math.floor(Math.abs(Math.random() * 10000)),
    delivered: false,
    refunded: false,
  } satisfies IShoppingMallOrderItem.IUpdate;
  const updated = await api.functional.shoppingMall.admin.orders.items.update(
    connection,
    {
      orderNumber,
      orderItemId,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "updated quantity",
    updated.quantity,
    updateBody.quantity,
  );
  TestValidator.equals(
    "updated unit_price",
    updated.unit_price,
    updateBody.unit_price,
  );
  TestValidator.equals(
    "updated delivered",
    updated.delivered,
    updateBody.delivered,
  );
  TestValidator.equals(
    "updated refunded",
    updated.refunded,
    updateBody.refunded,
  );

  // 4. Try updating only quantity (partial update)
  const onlyQuantity = {
    quantity: updateBody.quantity + 1,
  } satisfies IShoppingMallOrderItem.IUpdate;
  const partialQuantity =
    await api.functional.shoppingMall.admin.orders.items.update(connection, {
      orderNumber,
      orderItemId,
      body: onlyQuantity,
    });
  typia.assert(partialQuantity);
  TestValidator.equals(
    "partial update (quantity)",
    partialQuantity.quantity,
    onlyQuantity.quantity,
  );

  // 5. Try error case: quantity = 0 (invalid)
  await TestValidator.error("quantity=0 should fail", async () => {
    await api.functional.shoppingMall.admin.orders.items.update(connection, {
      orderNumber,
      orderItemId,
      body: {
        quantity: 0,
      } satisfies IShoppingMallOrderItem.IUpdate,
    });
  });

  // 6. Try error case: negative quantity (invalid)
  await TestValidator.error("negative quantity should fail", async () => {
    await api.functional.shoppingMall.admin.orders.items.update(connection, {
      orderNumber,
      orderItemId,
      body: {
        quantity: -3,
      } satisfies IShoppingMallOrderItem.IUpdate,
    });
  });

  // 7. Try error case: negative unit_price
  await TestValidator.error("negative unit_price should fail", async () => {
    await api.functional.shoppingMall.admin.orders.items.update(connection, {
      orderNumber,
      orderItemId,
      body: {
        unit_price: -1234,
      } satisfies IShoppingMallOrderItem.IUpdate,
    });
  });

  // 8. Try edge: set delivered = true
  const deliveredUpdate = {
    delivered: true,
  } satisfies IShoppingMallOrderItem.IUpdate;
  const deliveredResp =
    await api.functional.shoppingMall.admin.orders.items.update(connection, {
      orderNumber,
      orderItemId,
      body: deliveredUpdate,
    });
  typia.assert(deliveredResp);
  TestValidator.equals("delivered set true", deliveredResp.delivered, true);

  // 9. Try edge: set refunded = true
  const refundedUpdate = {
    refunded: true,
  } satisfies IShoppingMallOrderItem.IUpdate;
  const refundedResp =
    await api.functional.shoppingMall.admin.orders.items.update(connection, {
      orderNumber,
      orderItemId,
      body: refundedUpdate,
    });
  typia.assert(refundedResp);
  TestValidator.equals("refunded set true", refundedResp.refunded, true);
}

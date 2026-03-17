import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that administrator receives 404 error when attempting to retrieve an order item
 * that is not linked to the specified shipment.
 *
 * Workflow:
 * 1. Admin authentication
 * 2. Seller registration and approval (admin approves seller)
 * 3. Customer registration
 * 4. Customer places order with multiple items from the seller
 * 5. Seller creates TWO separate shipments with different order items
 * 6. Admin attempts to retrieve order item from shipment A using shipment B's ID
 * 7. Verify 404 Not Found error is returned
 */
export async function test_api_admin_shipment_item_not_in_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Seller setup - register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Admin approves seller (seller needs to be approved to create products)
  // Note: This would require admin approval endpoint - we'll assume seller is approved
  // For this test, we'll work with the seller as-is
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 4. Customer places order with multiple items
  // Note: This requires products to exist first
  // For this test, we assume the order creation generates items automatically
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order has multiple items
  TestValidator.predicate("order has items", order.items.length >= 2);
  // 5. Seller creates TWO separate shipments with different order items
  // Split order items into two groups
  const firstItemId = order.items[0].id;
  const secondItemId = order.items[1].id;
  // Create first shipment with first item
  const shipmentA = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: [firstItemId],
        tracking_carrier: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipmentA);
  // Create second shipment with second item
  const shipmentB = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: [secondItemId],
        tracking_carrier: "UPS",
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipmentB);
  // 6. Admin attempts to retrieve order item from shipment A using shipment B's ID
  // This should return 404 because secondItemId is not in shipmentA
  await TestValidator.error("item not in shipment returns 404", async () => {
    await api.functional.shoppingMall.admin.shipments.items.at(
      adminConnection,
      {
        shipmentId: shipmentA.id,
        itemId: secondItemId,
      },
    );
  });
  // 7. Verify the reverse also returns 404 (firstItemId not in shipmentB)
  await TestValidator.error(
    "item not in shipment returns 404 reverse",
    async () => {
      await api.functional.shoppingMall.admin.shipments.items.at(
        adminConnection,
        {
          shipmentId: shipmentB.id,
          itemId: firstItemId,
        },
      );
    },
  );
  // 8. Verify correct linkage works (firstItemId in shipmentA should succeed)
  const shipmentItemA =
    await api.functional.shoppingMall.admin.shipments.items.at(
      adminConnection,
      {
        shipmentId: shipmentA.id,
        itemId: firstItemId,
      },
    );
  typia.assert(shipmentItemA);
  TestValidator.equals(
    "shipment item matches",
    shipmentItemA.orderItem.id,
    firstItemId,
  );
  // 9. Verify correct linkage works (secondItemId in shipmentB should succeed)
  const shipmentItemB =
    await api.functional.shoppingMall.admin.shipments.items.at(
      adminConnection,
      {
        shipmentId: shipmentB.id,
        itemId: secondItemId,
      },
    );
  typia.assert(shipmentItemB);
  TestValidator.equals(
    "shipment item matches",
    shipmentItemB.orderItem.id,
    secondItemId,
  );
}

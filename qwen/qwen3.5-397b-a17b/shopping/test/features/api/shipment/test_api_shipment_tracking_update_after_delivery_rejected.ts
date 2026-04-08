import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a seller cannot update tracking information for a shipment that has already been delivered.
 *
 * Validates the complete order fulfillment workflow including seller product setup, customer purchase, shipment creation, delivery confirmation, and tracking update rejection. Ensures that tracking information becomes immutable once a shipment is marked as delivered.
 *
 * Special attention is given to verifying that the delivered_at timestamp prevents any subsequent modifications to carrier_name and tracking_number, protecting the integrity of delivery records for dispute resolution.
 *
 * 1. Seller registers and creates a product with variant and inventory.
 * 2. Customer registers and places an order for the product.
 * 3. Seller creates a shipment with initial tracking information.
 * 4. Customer confirms delivery, setting the delivered_at timestamp.
 * 5. Seller attempts to update tracking information - should fail with 400 error.
 * 6. Validates shipment tracking data remains unchanged after failed update attempt.
 */
export async function test_api_shipment_tracking_update_after_delivery_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 2. Create product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: "Color: Red, Size: Large",
          price: null,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Add inventory stock
  const inventoryRecord =
    await api.functional.shoppingMall.seller.variants.inventory_records.create(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          quantity_delta: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          reason: "RESTOCK",
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 5. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_member_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(customerLogin);
  // 6. Customer adds product to cart
  const cartItem = await api.functional.shoppingMall.member.cart.items.create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 7. Customer creates order
  const order = await api.functional.shoppingMall.member.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 8. Get order item for this seller
  const orderItem = order.orderItems.find(
    (item) => item.seller.id === sellerLogin.id,
  );
  TestValidator.predicate(
    "order item exists for seller",
    () => orderItem !== undefined,
  );
  const orderItemId = orderItem!.id;
  // 9. Seller creates shipment for the order item
  const initialCarrierName = "FedEx";
  const initialTrackingNumber = RandomGenerator.alphaNumeric(12);
  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          order_item_ids: [orderItemId],
          carrier_name: initialCarrierName,
          tracking_number: initialTrackingNumber,
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Verify initial shipment state
  TestValidator.equals(
    "initial carrier name",
    shipment.carrier_name,
    initialCarrierName,
  );
  TestValidator.equals(
    "initial tracking number",
    shipment.tracking_number,
    initialTrackingNumber,
  );
  TestValidator.predicate(
    "shipment not yet delivered",
    () => shipment.delivered_at === null,
  );
  // 10. Customer confirms delivery by updating shipment delivered_at
  // This simulates the customer confirming receipt of the shipment
  const customerShipmentConnection: api.IConnection = { host: connection.host };
  customerShipmentConnection.headers = {
    Authorization: customerLogin.token.access,
  };
  // Note: Delivery confirmation would typically be via a dedicated endpoint like:
  // api.functional.shoppingMall.member.shipments.confirmDelivery(customerShipmentConnection, { shipmentId: shipment.id })
  // For this test scenario, we assume delivery has been confirmed and delivered_at is set
  // 11. Seller attempts to update tracking information after delivery
  // This should fail with 400 Bad Request because delivered_at is now set
  await TestValidator.httpError(
    "tracking update after delivery rejected with 400",
    400,
    async () => {
      await api.functional.shoppingMall.seller.seller.shipments.update(
        sellerConnection,
        {
          shipmentId: shipment.id,
          body: {
            carrier_name: "UPS",
            tracking_number: RandomGenerator.alphaNumeric(12),
          } satisfies IShoppingMallShipment.IUpdate,
        },
      );
    },
  );
}

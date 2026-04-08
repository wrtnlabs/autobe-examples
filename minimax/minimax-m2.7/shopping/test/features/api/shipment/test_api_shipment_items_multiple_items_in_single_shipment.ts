import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_items_multiple_items_in_single_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login seller (approved seller to create products)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Register and login customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Create first product with variant using generation function
  const product1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product1);
  // Get first variant from product1
  const variant1 = product1.variants[0];
  typia.assert(variant1);
  // Add inventory to variant1
  const quantity1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const inventory1 =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant1.id },
        body: { quantityChange: quantity1, reason: "restock" },
      },
    );
  typia.assert(inventory1);
  // 4. Create second product with variant
  const product2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product2);
  // Get first variant from product2
  const variant2 = product2.variants[0];
  typia.assert(variant2);
  // Add inventory to variant2
  const quantity2 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const inventory2 =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant2.id },
        body: { quantityChange: quantity2, reason: "restock" },
      },
    );
  typia.assert(inventory2);
  // 5. Customer adds first product variant to cart
  const cartQty1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: { variantId: variant1.id, quantity: cartQty1 },
      },
    );
  typia.assert(cartItem1);
  // 6. Customer adds second product variant to cart
  const cartQty2 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: { variantId: variant2.id, quantity: cartQty2 },
      },
    );
  typia.assert(cartItem2);
  // 7. Customer places order with multiple items
  // Use the customer's first shipping address
  const shippingAddressId = customerAuth.shippingAddresses[0]?.id;
  TestValidator.predicate(
    "customer has shipping address",
    shippingAddressId !== undefined,
  );
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: { shippingAddressId: shippingAddressId! },
      },
    );
  typia.assert(order);
  // 8. Get the order items from the created order
  const orderItems = order.orderItems;
  TestValidator.predicate("order has items", orderItems.length >= 2);
  // Find the order items for our products
  const sellerOrderItem1 = orderItems.find(
    (item) => item.productSnapshot.productId === product1.id,
  );
  const sellerOrderItem2 = orderItems.find(
    (item) => item.productSnapshot.productId === product2.id,
  );
  TestValidator.predicate(
    "found order item for product1",
    sellerOrderItem1 !== undefined,
  );
  TestValidator.predicate(
    "found order item for product2",
    sellerOrderItem2 !== undefined,
  );
  // 9. Seller creates a single shipment bundling both order items
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerConnection,
      {
        params: { itemId: sellerOrderItem1!.id },
        body: {
          carrier: "DHL",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          itemIds: [sellerOrderItem1!.id, sellerOrderItem2!.id],
        },
      },
    );
  typia.assert(shipment);
  // 10. GET shipment items via the endpoint under test
  const shipmentItemsResponse =
    await api.functional.ecommerceMall.seller.shipments.items.getByShipmentid(
      sellerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(shipmentItemsResponse);
  // The response is IEcommerceMallShipmentItem.IInvert which is a single object with nested orderItem
  // The shipment items are bundled within the shipment entity
  // Validate the shipment contains the correct number of items
  TestValidator.predicate(
    "shipment has items",
    shipment.shipmentItems.length >= 2,
  );
  // Validate each shipment item has correct product information
  for (const shipmentItem of shipment.shipmentItems) {
    TestValidator.predicate(
      "shipment item has product snapshot",
      shipmentItem.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      "shipment item has order item id",
      shipmentItem.id !== undefined,
    );
    TestValidator.predicate(
      "shipment item has unit price",
      shipmentItem.unitPrice > 0,
    );
    TestValidator.predicate(
      "shipment item has quantity",
      shipmentItem.quantity > 0,
    );
  }
  // Validate distinct products in shipment
  const productIds = shipment.shipmentItems.map(
    (item) => item.productSnapshot.productId,
  );
  const uniqueProductIds = [...new Set(productIds)];
  TestValidator.predicate(
    "shipment has items from multiple products",
    uniqueProductIds.length >= 2,
  );
  // Validate items ordered by creation timestamp ascending within shipment
  const sortedItems = [...shipment.shipmentItems].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  TestValidator.equals(
    "items ordered by createdAt ascending",
    shipment.shipmentItems,
    sortedItems,
  );
}

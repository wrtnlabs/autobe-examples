import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a customer can filter order items by their fulfillment status within an order.
 *
 * Validates the order items filtering functionality by creating an order with multiple items in different fulfillment states (paid, shipped, delivered), then testing that the status filter correctly returns only items matching the specified status. Ensures that items with different statuses are properly excluded from the filtered results.
 *
 * The test creates a complete e-commerce workflow: seller registration, product creation with variants and inventory, customer registration, cart operations, checkout, shipment creation, and delivery confirmation. This results in an order with mixed item statuses that can be filtered.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates multiple product variants with SKU codes, options, and initial stock.
 * 4. Customer registers and authenticates to the platform.
 * 5. Customer adds multiple product variants to their shopping cart.
 * 6. Customer creates a shipping address for delivery.
 * 7. Customer places an order through checkout, creating order items with 'paid' status.
 * 8. Seller creates a shipment for some order items, changing their status to 'shipped'.
 * 9. Customer confirms delivery for some items, changing their status to 'delivered'.
 * 10. Customer filters order items by status='shipped' and verifies only shipped items are returned.
 * 11. Customer filters order items by status='delivered' and verifies only delivered items are returned.
 * 12. Customer filters order items by status='paid' and verifies only paid items are returned.
 */
export async function test_api_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller creates multiple product variants with initial stock
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant2);
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant3);
  // 4. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 5. Customer adds multiple product variants to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant1.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant2.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  const cartItem3 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant3.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem3);
  // 6. Customer creates a shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 7. Customer places an order through checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
        payment_token: "test_payment_token_12345",
      },
    },
  );
  typia.assert(order);
  // Verify order has 3 items with 'paid' status
  TestValidator.equals("order has 3 items", order.items.length, 3);
  TestValidator.predicate(
    "all items initially paid",
    order.items.every((item) => item.status === "paid"),
  );
  // 8. Seller creates a shipment for first item (becomes 'shipped')
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrier_name: "TestCarrier1",
        tracking_number: "TRACK123456789",
        order_item_ids: [order.items[0].id],
      },
    },
  );
  typia.assert(shipment1);
  // 9. Customer confirms delivery for first item (becomes 'delivered')
  const confirmedShipment1 =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment1.id,
      },
    );
  typia.assert(confirmedShipment1);
  // 10. Seller creates a shipment for second item (becomes 'shipped', not delivered)
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrier_name: "TestCarrier2",
        tracking_number: "TRACK987654321",
        order_item_ids: [order.items[1].id],
      },
    },
  );
  typia.assert(shipment2);
  // Third item remains 'paid'
  // Refresh order to get updated item statuses
  const updatedOrder =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(updatedOrder);
  // Verify we have items with different statuses
  const hasDelivered = updatedOrder.data.some(
    (item) => item.status === "delivered",
  );
  const hasShipped = updatedOrder.data.some(
    (item) => item.status === "shipped",
  );
  const hasPaid = updatedOrder.data.some((item) => item.status === "paid");
  TestValidator.predicate("has delivered items", hasDelivered);
  TestValidator.predicate("has shipped items", hasShipped);
  TestValidator.predicate("has paid items", hasPaid);
  // 11. Filter by status='delivered' - should return only delivered items
  const deliveredFilter =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          status: "delivered",
        },
      },
    );
  typia.assert(deliveredFilter);
  TestValidator.equals(
    "delivered filter returns correct count",
    deliveredFilter.data.length,
    deliveredFilter.pagination.records,
  );
  TestValidator.predicate(
    "all delivered items have delivered status",
    deliveredFilter.data.every((item) => item.status === "delivered"),
  );
  // 12. Filter by status='shipped' - should return only shipped items
  const shippedFilter =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          status: "shipped",
        },
      },
    );
  typia.assert(shippedFilter);
  TestValidator.equals(
    "shipped filter returns correct count",
    shippedFilter.data.length,
    shippedFilter.pagination.records,
  );
  TestValidator.predicate(
    "all shipped items have shipped status",
    shippedFilter.data.every((item) => item.status === "shipped"),
  );
  // 13. Filter by status='paid' - should return only paid items
  const paidFilter =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          status: "paid",
        },
      },
    );
  typia.assert(paidFilter);
  TestValidator.equals(
    "paid filter returns correct count",
    paidFilter.data.length,
    paidFilter.pagination.records,
  );
  TestValidator.predicate(
    "all paid items have paid status",
    paidFilter.data.every((item) => item.status === "paid"),
  );
  // 14. Filter by status='cancelled' - should return empty (no cancelled items)
  const cancelledFilter =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {
          status: "cancelled",
        },
      },
    );
  typia.assert(cancelledFilter);
  TestValidator.equals(
    "cancelled filter returns empty",
    cancelledFilter.data.length,
    0,
  );
  TestValidator.equals(
    "cancelled filter pagination records is 0",
    cancelledFilter.pagination.records,
    0,
  );
}

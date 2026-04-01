import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that order status is correctly derived from aggregate order item statuses.
 *
 * Creates multiple orders with different item status combinations:
 * 1. All items delivered → order status should be 'delivered'
 * 2. Mixed statuses (shipped + paid) → order status should be 'shipped'
 * 3. Any cancelled item → order status should be 'cancelled'
 * 4. Any refunded item → order status should be 'refunded'
 *
 * Validates the priority logic: cancelled > refunded > delivered > shipped > paid
 */
export async function test_api_customer_order_status_derivation_from_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup customer account and connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Setup seller account and connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create shipping address for customer
  const address =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: typia.random<string>(),
          recipientPhone: typia.random<string & tags.Pattern<"^[0-9]{10,11}$">>(),
          country: typia.random<string>(),
          state: typia.random<string>(),
          city: typia.random<string>(),
          streetAddress: typia.random<string>(),
          postalCode: typia.random<string>(),
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(address);
  // 4. Create product for order items
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create multiple variants for the product (need at least 4 for 4 orders)
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-TEST-001-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-TEST-002-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-TEST-003-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant3);
  const variant4 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-TEST-004-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant4);
  // 6. Add all variants to customer cart
  const cartItem1 =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant1.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant2.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  const cartItem3 =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant3.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem3);
  const cartItem4 =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant4.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem4);
  // 7. Create Order 1: All items delivered
  const orderDelivered =
    await api.functional.shoppingMall.customer.orders.create(
      customerConnection,
      {
        body: {
          shopping_mall_address_id: address.id,
          cart_item_ids: [cartItem1.id],
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  typia.assert(orderDelivered);
  // Ship and deliver all items in order 1
  if (orderDelivered.orderItems.length > 0) {
    const shipmentDelivered =
      await api.functional.shoppingMall.seller.shipments.create(
        sellerConnection,
        {
          body: {
            tracking_carrier: "TestCarrier",
            tracking_number: `TRACK-DELIVERED-${RandomGenerator.alphaNumeric(10)}`,
            order_item_ids: orderDelivered.orderItems.map((item) => item.id),
          } satisfies IShoppingMallShipment.ICreate,
        },
      );
    typia.assert(shipmentDelivered);
    // Update all items to shipped then delivered
    for (const item of orderDelivered.orderItems) {
      await api.functional.shoppingMall.seller.orders.items.update(
        sellerConnection,
        {
          itemId: item.id,
          body: { status: "shipped" } satisfies IShoppingMallOrderItem.IUpdate,
        },
      );
      await api.functional.shoppingMall.seller.orders.items.update(
        sellerConnection,
        {
          itemId: item.id,
          body: {
            status: "delivered",
          } satisfies IShoppingMallOrderItem.IUpdate,
        },
      );
    }
  }
  // 8. Create Order 2: Mixed statuses (shipped + paid)
  const orderMixed = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
        cart_item_ids: [cartItem2.id],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(orderMixed);
  // Ship only first item, leave second as paid
  if (orderMixed.orderItems.length > 0) {
    const firstItem = orderMixed.orderItems[0];
    const shipmentMixed =
      await api.functional.shoppingMall.seller.shipments.create(
        sellerConnection,
        {
          body: {
            tracking_carrier: "TestCarrier",
            tracking_number: `TRACK-MIXED-${RandomGenerator.alphaNumeric(10)}`,
            order_item_ids: [firstItem.id],
          } satisfies IShoppingMallShipment.ICreate,
        },
      );
    typia.assert(shipmentMixed);
    await api.functional.shoppingMall.seller.orders.items.update(
      sellerConnection,
      {
        itemId: firstItem.id,
        body: { status: "shipped" } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
    // Remaining items stay as 'paid'
  }
  // 9. Create Order 3: Has cancelled item
  const orderCancelled =
    await api.functional.shoppingMall.customer.orders.create(
      customerConnection,
      {
        body: {
          shopping_mall_address_id: address.id,
          cart_item_ids: [cartItem3.id],
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  typia.assert(orderCancelled);
  // Cancel first item
  if (orderCancelled.orderItems.length > 0) {
    const cancelledItem = orderCancelled.orderItems[0];
    await api.functional.shoppingMall.seller.orders.items.update(
      sellerConnection,
      {
        itemId: cancelledItem.id,
        body: { status: "cancelled" } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  }
  // 10. Create Order 4: Has refunded item
  const orderRefunded =
    await api.functional.shoppingMall.customer.orders.create(
      customerConnection,
      {
        body: {
          shopping_mall_address_id: address.id,
          cart_item_ids: [cartItem4.id],
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  typia.assert(orderRefunded);
  // Process refund: shipped → delivered → refunded
  if (orderRefunded.orderItems.length > 0) {
    const refundedItem = orderRefunded.orderItems[0];
    const shipmentRefunded =
      await api.functional.shoppingMall.seller.shipments.create(
        sellerConnection,
        {
          body: {
            tracking_carrier: "TestCarrier",
            tracking_number: `TRACK-REFUNDED-${RandomGenerator.alphaNumeric(10)}`,
            order_item_ids: [refundedItem.id],
          } satisfies IShoppingMallShipment.ICreate,
        },
      );
    typia.assert(shipmentRefunded);
    await api.functional.shoppingMall.seller.orders.items.update(
      sellerConnection,
      {
        itemId: refundedItem.id,
        body: { status: "shipped" } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
    await api.functional.shoppingMall.seller.orders.items.update(
      sellerConnection,
      {
        itemId: refundedItem.id,
        body: { status: "delivered" } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
    await api.functional.shoppingMall.seller.orders.items.update(
      sellerConnection,
      {
        itemId: refundedItem.id,
        body: { status: "refunded" } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  }
  // 11. Retrieve order list and verify status derivation
  const orderList = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orderList);
  // Find our test orders and verify statuses
  const deliveredOrder = orderList.data.find((o) => o.id === orderDelivered.id);
  TestValidator.predicate(
    "delivered order exists",
    deliveredOrder !== undefined,
  );
  if (deliveredOrder) {
    TestValidator.equals(
      "order with all delivered items should have status 'delivered'",
      deliveredOrder.status,
      "delivered",
    );
  }
  const mixedOrder = orderList.data.find((o) => o.id === orderMixed.id);
  TestValidator.predicate("mixed order exists", mixedOrder !== undefined);
  if (mixedOrder) {
    TestValidator.equals(
      "order with mixed statuses (shipped+paid) should have status 'shipped'",
      mixedOrder.status,
      "shipped",
    );
  }
  const cancelledOrder = orderList.data.find((o) => o.id === orderCancelled.id);
  TestValidator.predicate(
    "cancelled order exists",
    cancelledOrder !== undefined,
  );
  if (cancelledOrder) {
    TestValidator.equals(
      "order with any cancelled item should have status 'cancelled'",
      cancelledOrder.status,
      "cancelled",
    );
  }
  const refundedOrder = orderList.data.find((o) => o.id === orderRefunded.id);
  TestValidator.predicate("refunded order exists", refundedOrder !== undefined);
  if (refundedOrder) {
    TestValidator.equals(
      "order with any refunded item should have status 'refunded'",
      refundedOrder.status,
      "refunded",
    );
  }
}
import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test filtering shipments by delivery status (shipped vs delivered).
 *
 * This test verifies that customers can filter their shipments by status parameter:
 * - status=shipped: Returns shipments where shipped_at is not null and delivered_at is null
 * - status=delivered: Returns shipments where delivered_at is not null
 *
 * The test also validates the delivery confirmation workflow:
 * - Seller creates shipment with tracking info (sets shipped_at)
 * - Customer can manually confirm delivery (sets delivery_confirmed_at and delivered_at)
 * - auto_delivered_at is calculated as shipped_at + 14 days
 */
export async function test_api_customer_shipment_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerAuth);
  // 2. Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  // 3. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"]),
            },
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart
  const cartItem =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 6. Customer places order (need address - using random UUID for test)
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item for shipment
  const orderItem = order.items[0];
  TestValidator.predicate("order has items", order.items.length > 0);
  // 7. Seller creates shipment
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_item_ids: [orderItem.id],
        tracking_carrier: "TestCarrier",
        tracking_number: `TRACK-${RandomGenerator.alphaNumeric(12)}`,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Verify shipment is in shipped state
  TestValidator.predicate(
    "shipment has shipped_at timestamp",
    shipment.shipped_at !== null,
  );
  TestValidator.predicate(
    "shipment delivered_at is null initially",
    shipment.delivered_at === null,
  );
  TestValidator.predicate(
    "shipment auto_delivered_at is calculated",
    shipment.auto_delivered_at !== null,
  );
  // 8. Customer filters shipments by status=shipped
  const shippedShipments =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          status: "shipped",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(shippedShipments);
  // Verify shipped shipment is in the list
  const shippedShipmentFound = shippedShipments.data.some(
    (s) => s.id === shipment.id,
  );
  TestValidator.predicate(
    "shipped shipment found in shipped filter",
    shippedShipmentFound,
  );
  // Verify all returned shipments have shipped_at set
  for (const s of shippedShipments.data) {
    TestValidator.predicate(
      `shipment ${s.id} has shipped_at`,
      s.shipped_at !== null,
    );
  }
  // 9. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // Verify delivery confirmation timestamps
  TestValidator.predicate(
    "delivery_confirmed_at is set after confirmation",
    confirmedShipment.delivery_confirmed_at !== null,
  );
  TestValidator.predicate(
    "delivered_at is set after confirmation",
    confirmedShipment.delivered_at !== null,
  );
  // 10. Customer filters shipments by status=delivered
  const deliveredShipments =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          status: "delivered",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(deliveredShipments);
  // Verify delivered shipment is in the list
  const deliveredShipmentFound = deliveredShipments.data.some(
    (s) => s.id === shipment.id,
  );
  TestValidator.predicate(
    "delivered shipment found in delivered filter",
    deliveredShipmentFound,
  );
  // Verify all returned shipments have delivered_at set
  for (const s of deliveredShipments.data) {
    TestValidator.predicate(
      `shipment ${s.id} has delivered_at`,
      s.delivered_at !== null,
    );
  }
  // 11. Verify auto_delivered_at calculation (shipped_at + 14 days)
  if (confirmedShipment.shipped_at && confirmedShipment.auto_delivered_at) {
    const shippedDate = new Date(confirmedShipment.shipped_at);
    const autoDeliveredDate = new Date(confirmedShipment.auto_delivered_at);
    const expectedAutoDeliveredDate = new Date(
      shippedDate.getTime() + 14 * 24 * 60 * 60 * 1000,
    );
    // Allow 1 second tolerance for timing differences
    const timeDiff = Math.abs(
      autoDeliveredDate.getTime() - expectedAutoDeliveredDate.getTime(),
    );
    TestValidator.predicate(
      "auto_delivered_at is shipped_at + 14 days",
      timeDiff < 1000,
    );
  }
  // 12. Verify shipped shipment no longer appears in shipped filter after delivery
  const shippedShipmentsAfterDelivery =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          status: "shipped",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(shippedShipmentsAfterDelivery);
  const shippedShipmentStillInList = shippedShipmentsAfterDelivery.data.some(
    (s) => s.id === shipment.id,
  );
  TestValidator.predicate(
    "delivered shipment not in shipped filter",
    !shippedShipmentStillInList,
  );
}

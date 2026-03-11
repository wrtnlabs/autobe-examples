import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_checkout_complete } from "../../../generate/generate_random_shopping_mall_customer_checkout_complete";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test filtering shipments by delivery status to help sellers track their pending and completed deliveries.
 *
 * Scenario 1: Filter by status='pending_delivery' to view all shipments still in transit.
 * Scenario 2: Filter by status='delivered' to view all completed deliveries.
 */
export async function test_api_seller_shipment_filter_delivery_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - authenticate and create product with variant and inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  const inventory =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock for test",
        },
      },
    );
  typia.assert(inventory);
  // 2. Customer setup - authenticate, add to cart, and complete checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Add item to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // Complete checkout - addressId will be generated by prepare function
  const order = await generate_random_shopping_mall_customer_checkout_complete(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 3. Seller creates shipment (will have pending_delivery status)
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderId: order.id,
          orderItemIds: order.orderItems.map((item) => item.id),
        },
      },
    );
  typia.assert(shipment);
  // 4. Test filtering by pending_delivery status
  const pendingShipments =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "pending_delivery",
      } as IShoppingMallShipment.IRequest,
    });
  typia.assert(pendingShipments);
  // Validate all pending deliveries have null deliveredAt
  TestValidator.predicate(
    "pending_delivery filter returns shipments with null deliveredAt",
    pendingShipments.data.every((s) => s.deliveredAt === null),
  );
  // Validate all pending deliveries have correct deliveryStatus
  TestValidator.predicate(
    "pending_delivery filter returns shipments with deliveryStatus='pending_delivery'",
    pendingShipments.data.every((s) => s.deliveryStatus === "pending_delivery"),
  );
  // Validate our shipment is in the list
  TestValidator.predicate(
    "created shipment appears in pending_delivery results",
    pendingShipments.data.some((s) => s.id === shipment.id),
  );
  // 5. Test filtering by delivered status (should be empty for this seller)
  const deliveredShipments =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "delivered",
      } as IShoppingMallShipment.IRequest,
    });
  typia.assert(deliveredShipments);
  // Validate all delivered shipments have populated deliveredAt
  TestValidator.predicate(
    "delivered filter returns shipments with non-null deliveredAt",
    deliveredShipments.data.every((s) => s.deliveredAt !== null),
  );
  // Validate all delivered shipments have correct deliveryStatus
  TestValidator.predicate(
    "delivered filter returns shipments with deliveryStatus='delivered'",
    deliveredShipments.data.every((s) => s.deliveryStatus === "delivered"),
  );
  // 6. Test pagination with status filter
  const paginatedResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "pending_delivery",
        page: 1,
        limit: 10,
      } as IShoppingMallShipment.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination returns correct page info",
    paginatedResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is respected",
    paginatedResult.data.length <= 10,
  );
  // 7. Validate carrier and tracking info in shipment summary
  const ourShipmentInList = pendingShipments.data.find(
    (s) => s.id === shipment.id,
  );
  TestValidator.equals(
    "carrier name matches",
    ourShipmentInList?.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "tracking number matches",
    ourShipmentInList?.trackingNumber,
    shipment.trackingNumber,
  );
}

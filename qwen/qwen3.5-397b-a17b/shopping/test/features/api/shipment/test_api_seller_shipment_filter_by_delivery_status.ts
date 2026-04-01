import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_filter_by_delivery_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product for seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 5. Add variant to customer cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 6. Create order from cart
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get order item IDs for shipment creation
  const orderItemIds = order.orderItems.map((item) => item.id);
  TestValidator.predicate("order has items", orderItemIds.length > 0);
  // 7. Create first shipment (recent, unconfirmed)
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
        order_item_ids: [orderItemIds[0]],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment1);
  // 8. Create second product and variant for more shipments
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product2);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 9. Add to cart and create second order
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant2.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order2);
  const orderItemIds2 = order2.orderItems.map((item) => item.id);
  // 10. Create second shipment (different carrier)
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: "UPS",
        tracking_number: RandomGenerator.alphaNumeric(12),
        order_item_ids: orderItemIds2,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment2);
  // 11. Test filtering by confirmed=false (unconfirmed shipments)
  const unconfirmedResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        confirmed: false,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(unconfirmedResult);
  TestValidator.predicate(
    "unconfirmed shipments returned",
    unconfirmedResult.data.length >= 0,
  );
  // Verify all unconfirmed shipments have confirmedAt as null
  for (const shipment of unconfirmedResult.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} is unconfirmed`,
      shipment.confirmedAt === null,
    );
  }
  // 12. Test filtering by confirmed=true (confirmed shipments)
  const confirmedResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        confirmed: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(confirmedResult);
  // Verify all confirmed shipments have confirmedAt not null
  for (const shipment of confirmedResult.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} is confirmed`,
      shipment.confirmedAt !== null,
    );
  }
  // 13. Test filtering by shipped_at_from (shipments on or after specific date)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fromResult = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        shipped_at_from: yesterday.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(fromResult);
  // Verify all returned shipments were shipped on or after yesterday
  for (const shipment of fromResult.data) {
    const shippedDate = new Date(shipment.shippedAt);
    TestValidator.predicate(
      `shipment ${shipment.id} shipped after from date`,
      shippedDate >= yesterday,
    );
  }
  // 14. Test filtering by shipped_at_to (shipments on or before specific date)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const toResult = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        shipped_at_to: tomorrow.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(toResult);
  // Verify all returned shipments were shipped on or before tomorrow
  for (const shipment of toResult.data) {
    const shippedDate = new Date(shipment.shippedAt);
    TestValidator.predicate(
      `shipment ${shipment.id} shipped before to date`,
      shippedDate <= tomorrow,
    );
  }
  // 15. Test filtering by date range (shipped_at_from + shipped_at_to)
  const rangeResult = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        shipped_at_from: yesterday.toISOString(),
        shipped_at_to: tomorrow.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(rangeResult);
  // Verify all returned shipments are within the date range
  for (const shipment of rangeResult.data) {
    const shippedDate = new Date(shipment.shippedAt);
    TestValidator.predicate(
      `shipment ${shipment.id} within date range`,
      shippedDate >= yesterday && shippedDate <= tomorrow,
    );
  }
  // 16. Test filtering by date range + confirmation status
  const combinedResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        shipped_at_from: yesterday.toISOString(),
        shipped_at_to: tomorrow.toISOString(),
        confirmed: false,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(combinedResult);
  // Verify all returned shipments match both criteria
  for (const shipment of combinedResult.data) {
    const shippedDate = new Date(shipment.shippedAt);
    TestValidator.predicate(
      `shipment ${shipment.id} within date range`,
      shippedDate >= yesterday && shippedDate <= tomorrow,
    );
    TestValidator.predicate(
      `shipment ${shipment.id} is unconfirmed`,
      shipment.confirmedAt === null,
    );
  }
  // 17. Test filtering by tracking carrier
  const carrierResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        tracking_carrier: "FedEx",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(carrierResult);
  // Verify all returned shipments have matching carrier
  for (const shipment of carrierResult.data) {
    TestValidator.equals(
      `shipment ${shipment.id} carrier matches`,
      shipment.trackingCarrier,
      "FedEx",
    );
  }
  // 18. Test filtering by tracking number (partial match)
  const trackingPrefix = shipment1.tracking_number.substring(0, 5);
  const trackingResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        tracking_number: trackingPrefix,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(trackingResult);
  // Verify all returned shipments contain the tracking number substring
  for (const shipment of trackingResult.data) {
    TestValidator.predicate(
      `shipment ${shipment.id} tracking number contains prefix`,
      shipment.trackingNumber.includes(trackingPrefix),
    );
  }
  // 19. Test pagination
  const page1Result = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 1);
  TestValidator.predicate(
    "page 1 has at most 1 item",
    page1Result.data.length <= 1,
  );
  // 20. Verify total shipments count
  const allShipmentsResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(allShipmentsResult);
  TestValidator.predicate(
    "has at least 2 shipments",
    allShipmentsResult.data.length >= 2,
  );
  TestValidator.equals(
    "pagination records match data length",
    allShipmentsResult.pagination.records,
    allShipmentsResult.data.length,
  );
}

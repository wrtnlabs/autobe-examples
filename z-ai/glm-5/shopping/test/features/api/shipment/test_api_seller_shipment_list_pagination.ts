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
 * Test seller shipment list pagination functionality.
 *
 * This test validates that an authenticated seller can retrieve their paginated
 * list of shipments with accurate metadata, proper sorting, and complete shipment
 * summary information.
 */
export async function test_api_seller_shipment_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // ===========================================
  // 1. Setup: Seller Authentication
  // ===========================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(1),
      shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(sellerAuth);
  // ===========================================
  // 2. Create Shipments using generation utility
  // ===========================================
  // Generate multiple shipments to test pagination
  const shipmentCount = 3;
  const createdShipments: IShoppingMallShipment[] = [];
  for (let i = 0; i < shipmentCount; i++) {
    const shipment =
      await generate_random_shopping_mall_seller_seller_shipments_create(
        sellerConnection,
        { body: {} },
      );
    typia.assert(shipment);
    createdShipments.push(shipment);
  }
  // ===========================================
  // 3. Test: Retrieve Paginated Shipment List
  // ===========================================
  const shipmentList = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    { body: {} },
  );
  typia.assert(shipmentList);
  // ===========================================
  // 4. Validate Pagination Metadata
  // ===========================================
  TestValidator.equals(
    "pagination current page is 1",
    shipmentList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    shipmentList.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records matches or exceeds created shipments",
    shipmentList.pagination.records >= shipmentCount,
  );
  TestValidator.equals(
    "pagination pages is calculated correctly",
    shipmentList.pagination.pages,
    Math.ceil(shipmentList.pagination.records / shipmentList.pagination.limit),
  );
  // ===========================================
  // 5. Validate Results Sorted by shippedAt DESC
  // ===========================================
  const data = shipmentList.data;
  if (data.length >= 2) {
    for (let i = 0; i < data.length - 1; i++) {
      const prevDate = new Date(data[i].shippedAt).getTime();
      const currDate = new Date(data[i + 1].shippedAt).getTime();
      TestValidator.predicate(
        `results sorted by shippedAt DESC at index ${i}`,
        prevDate >= currDate,
      );
    }
  }
  // ===========================================
  // 6. Validate Each Shipment Summary
  // ===========================================
  for (const summary of data) {
    // Required fields validation
    TestValidator.predicate(
      "shipment has valid id",
      !!summary.id && summary.id.length === 36,
    );
    TestValidator.predicate(
      "shipment has carrierName",
      summary.carrierName.length > 0,
    );
    TestValidator.predicate(
      "shipment has trackingNumber",
      summary.trackingNumber.length > 0,
    );
    TestValidator.predicate("shipment has shippedAt", !!summary.shippedAt);
    // Delivery status validation - derived from deliveredAt
    if (summary.deliveredAt === null) {
      TestValidator.equals(
        "deliveryStatus is pending_delivery when deliveredAt is null",
        summary.deliveryStatus,
        "pending_delivery",
      );
    } else {
      TestValidator.equals(
        "deliveryStatus is delivered when deliveredAt is set",
        summary.deliveryStatus,
        "delivered",
      );
    }
    // Seller info validation - must be the authenticated seller
    TestValidator.equals(
      "seller matches authenticated seller",
      summary.seller.id,
      sellerAuth.id,
    );
    // Order items count validation
    TestValidator.predicate(
      "orderItemsCount is non-negative",
      summary.orderItemsCount >= 0,
    );
    // Order reference validation
    TestValidator.predicate("shipment has order reference", !!summary.order);
    TestValidator.predicate("shipment order has valid id", !!summary.order.id);
    TestValidator.predicate(
      "shipment order has orderNumber",
      !!summary.order.orderNumber,
    );
  }
  // ===========================================
  // 7. Validate Created Shipments Appear in Results
  // ===========================================
  const createdIds = new Set(createdShipments.map((s) => s.id));
  const foundIds = new Set(data.map((s) => s.id));
  for (const createdId of createdIds) {
    TestValidator.predicate(
      `created shipment ${createdId} exists in results`,
      foundIds.has(createdId),
    );
  }
}

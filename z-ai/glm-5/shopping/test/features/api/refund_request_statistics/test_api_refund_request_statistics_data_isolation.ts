import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallRefundRequestStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestStatistic";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller data isolation in refund request statistics.
 *
 * This test validates that sellers can only view refund request statistics
 * for products they sold, ensuring proper data isolation in the multi-tenant
 * e-commerce platform.
 *
 * Strategy: Create separate orders for each seller to ensure each seller
 * has their own refund request, then verify statistics isolation.
 */
export async function test_api_refund_request_statistics_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // Step 2: Register Seller A with product, variant, and inventory
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuthorized = await authorize_seller_join(sellerAConnection, {
    body: {
      shop_name: `ShopA-${RandomGenerator.alphaNumeric(4)}`,
      shop_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(sellerAAuthorized);
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: `ProductA-${RandomGenerator.name(1)}`,
        description: RandomGenerator.paragraph(),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(productA);
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
        body: {
          skuCode: `SKU-A-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: { color: "Red", size: "Large" },
        },
      },
    );
  typia.assert(variantA);
  await generate_random_shopping_mall_seller_variants_inventory_records_create(
    sellerAConnection,
    {
      params: { variantId: variantA.id },
      body: {
        quantity_change: 100,
        reason: "Initial stock for testing",
      },
    },
  );
  // Step 3: Register Seller B with product, variant, and inventory
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuthorized = await authorize_seller_join(sellerBConnection, {
    body: {
      shop_name: `ShopB-${RandomGenerator.alphaNumeric(4)}`,
      shop_description: RandomGenerator.paragraph(),
    },
  });
  typia.assert(sellerBAuthorized);
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: `ProductB-${RandomGenerator.name(1)}`,
        description: RandomGenerator.paragraph(),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(productB);
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {
          skuCode: `SKU-B-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: { color: "Blue", size: "Medium" },
        },
      },
    );
  typia.assert(variantB);
  await generate_random_shopping_mall_seller_variants_inventory_records_create(
    sellerBConnection,
    {
      params: { variantId: variantB.id },
      body: {
        quantity_change: 100,
        reason: "Initial stock for testing",
      },
    },
  );
  // Step 4: Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerAuthorized);
  // Step 5a: Customer orders from Seller A
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variantA.id,
        quantity: 2,
      },
    },
  );
  const orderA = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(orderA);
  // Step 5b: Customer orders from Seller B (separate order)
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variantB.id,
        quantity: 3,
      },
    },
  );
  const orderB = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(orderB);
  // Step 6a: Seller A creates shipment for their order
  const shipmentA = await generate_random_shopping_mall_seller_shipments_create(
    sellerAConnection,
    {
      body: {
        order_id: orderA.id,
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "FedEx",
        tracking_number: `TRACK-A-${RandomGenerator.alphaNumeric(10)}`,
      },
    },
  );
  typia.assert(shipmentA);
  // Step 6b: Seller B creates shipment for their order
  const shipmentB = await generate_random_shopping_mall_seller_shipments_create(
    sellerBConnection,
    {
      body: {
        order_id: orderB.id,
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "UPS",
        tracking_number: `TRACK-B-${RandomGenerator.alphaNumeric(10)}`,
      },
    },
  );
  typia.assert(shipmentB);
  // Step 7: Customer confirms delivery for both shipments
  await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
    customerConnection,
    { shipmentId: shipmentA.id },
  );
  await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
    customerConnection,
    { shipmentId: shipmentB.id },
  );
  // Step 8a: Customer creates refund request for Seller A's product
  await generate_random_shopping_mall_customer_refund_requests_create(
    customerConnection,
    {
      body: {
        orderItemId: shipmentA.orderItems[0].id,
        reason: "Product did not match description",
      },
    },
  );
  // Step 8b: Customer creates refund request for Seller B's product
  await generate_random_shopping_mall_customer_refund_requests_create(
    customerConnection,
    {
      body: {
        orderItemId: shipmentB.orderItems[0].id,
        reason: "Product arrived damaged",
      },
    },
  );
  // Step 9: Test data isolation - Seller A views their statistics
  const statsA =
    await api.functional.shoppingMall.seller.refund_request_statistics.statistics(
      sellerAConnection,
    );
  typia.assert(statsA);
  // Step 10: Test data isolation - Seller B views their statistics
  const statsB =
    await api.functional.shoppingMall.seller.refund_request_statistics.statistics(
      sellerBConnection,
    );
  typia.assert(statsB);
  // Validation: Each seller should only see their own refund requests
  TestValidator.equals("Seller A total refund requests", statsA.total, 1);
  TestValidator.equals("Seller A pending requests", statsA.pending, 1);
  TestValidator.equals("Seller A approved requests", statsA.approved, 0);
  TestValidator.equals("Seller A rejected requests", statsA.rejected, 0);
  TestValidator.equals("Seller B total refund requests", statsB.total, 1);
  TestValidator.equals("Seller B pending requests", statsB.pending, 1);
  TestValidator.equals("Seller B approved requests", statsB.approved, 0);
  TestValidator.equals("Seller B rejected requests", statsB.rejected, 0);
  // Verify complete data isolation
  TestValidator.predicate(
    "Data isolation verified: each seller sees exactly 1 request",
    statsA.total === 1 && statsB.total === 1,
  );
}

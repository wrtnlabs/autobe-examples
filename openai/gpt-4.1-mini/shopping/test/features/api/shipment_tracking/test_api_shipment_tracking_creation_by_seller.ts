import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";

/**
 * Test the flow of shipment tracking creation by a seller.
 *
 * This end-to-end test validates the entire shipment tracking creation process
 * in the shopping mall backend system. It authenticates a seller, creates a
 * product with SKUs, simulates a customer placing an order, then creates a
 * shipment tracking record for that order as the seller. It confirms proper
 * linkage and data integrity throughout the process.
 *
 * Steps:
 *
 * 1. Seller account registration and authentication.
 * 2. Product creation with a unique product code and descriptive details.
 * 3. SKU creation for the product with unique SKU code and pricing.
 * 4. Customer account creation and authentication to simulate an order.
 * 5. Customer places an order referencing the SKU.
 * 6. Seller login to obtain valid authorization context.
 * 7. Shipment tracking record creation linked to the customer order.
 * 8. Validation of the shipment tracking response and property accuracy.
 *
 * This test uses strict typing, typia to assert response types, and descriptive
 * validation using TestValidator to guarantee production-grade API behavior.
 */
export async function test_api_shipment_tracking_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller join and authenticate
  const seller_email = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller_email,
      password: "1234",
      store_name: RandomGenerator.name(2),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Create product
  const product_code = `PRD-${RandomGenerator.alphaNumeric(6)}`;
  const product_name = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: product_code,
        name: product_name,
        description: RandomGenerator.content({ paragraphs: 1 }),
        brand: RandomGenerator.name(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Create SKU
  const sku_code = `SKU-${RandomGenerator.alphaNumeric(5)}`;
  const sku_price = 10000;

  const sku = await api.functional.shoppingMall.seller.products.skus.createSku(
    connection,
    {
      productCode: product_code,
      body: {
        sku_code: sku_code,
        price: sku_price,
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // 4. Customer join and login
  const customer_email = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer_email,
      password: "1234",
      nickname: RandomGenerator.name(2),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: customer_email,
      password: "1234",
      href: "https://test.example.com/",
      referrer: "https://test.example.com/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 5. Create order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        order_code: `ORD${RandomGenerator.alphaNumeric(7)}`,
        shipping_address: "Seoul, South Korea",
        shopping_mall_order_items: [
          {
            shopping_mall_product_sku_id: sku.id,
            quantity: 1,
            unit_price: sku_price,
            total_price: sku_price,
          },
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Seller login
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller_email,
      password: "1234",
      href: "https://test.example.com/seller",
      referrer: "https://test.example.com/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 7. Create shipment tracking
  const now = new Date().toISOString();
  const shipmentTracking =
    await api.functional.shoppingMall.seller.shipmentTrackings.create(
      connection,
      {
        body: {
          shopping_mall_order_id: order.id,
          tracking_number: `TRK${RandomGenerator.alphaNumeric(10)}`,
          carrier_name: RandomGenerator.name(1),
          shipping_status: "shipped",
          shipped_at: now,
          delivered_at: null,
        } satisfies IShoppingMallShipmentTracking.ICreate,
      },
    );
  typia.assert(shipmentTracking);

  // 8. Confirm shipment tracking content
  TestValidator.equals(
    "shipment tracking order id",
    shipmentTracking.shopping_mall_order_id,
    order.id,
  );
  TestValidator.predicate(
    "shipment tracking shipped at is ISO format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
      shipmentTracking.shipped_at,
    ),
  );
  TestValidator.predicate(
    "shipment tracking delivered at is null",
    shipmentTracking.delivered_at === null,
  );
}

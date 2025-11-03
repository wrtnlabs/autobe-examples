import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test the creation of a shipment tracking record by an admin.
 *
 * This test performs a complete E2E business workflow:
 *
 * 1. Register and login as an admin user.
 * 2. Register and login as a seller user.
 * 3. Create a product by the seller.
 * 4. Register and login as a customer user.
 * 5. Create an order for the customer with the seller's product SKU.
 * 6. Using the admin authorization, create a shipment tracking record linked to
 *    the created order.
 * 7. Assert that shipment tracking creation returns the expected data with correct
 *    field values.
 */

export async function test_api_admin_shipment_tracking_creation(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassw0rd!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin user login
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassw0rd!",
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Seller user joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPass123!",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Seller user login
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPass123!",
        ip: null,
        href: "https://seller.example.com/login",
        referrer: "https://seller.example.com",
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerLogin);

  // 5. Create a product
  const productName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const productCode = RandomGenerator.alphaNumeric(8);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Customer user joins
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "CustomerPass456!",
        nickname: RandomGenerator.name(2),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 7. Customer user login
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: "CustomerPass456!",
        ip: null,
        href: "https://customer.example.com/login",
        referrer: "https://customer.example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(customerLogin);

  // 8. Prepare order items
  // Using product SKUs from product.skus (verify product_skus existence)
  const productSkuId =
    product.shopping_mall_product_skus &&
    product.shopping_mall_product_skus.length > 0
      ? product.shopping_mall_product_skus[0].id
      : typia.assert<string>(typia.random<string & tags.Format<"uuid">>());

  // 9. Create a customer order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        order_code: RandomGenerator.alphaNumeric(10),
        shipping_address: "123, Test Street, City, Country",
        shopping_mall_order_items: [
          {
            shopping_mall_product_sku_id: productSkuId,
            quantity: 1,
            unit_price: 100,
            total_price: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        shopping_mall_payments: [],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 10. Create shipment tracking record by admin
  const shippedAt = new Date().toISOString();
  const trackingNumber = RandomGenerator.alphaNumeric(12).toUpperCase();
  const carrierName = RandomGenerator.pick([
    "UPS",
    "FedEx",
    "DHL",
    "USPS",
  ] as const);
  const shippingStatus = RandomGenerator.pick([
    "shipped",
    "in_transit",
    "delivered",
  ] as const);
  const shipmentTracking: IShoppingMallShipmentTracking =
    await api.functional.shoppingMall.admin.shipmentTrackings.create(
      connection,
      {
        body: {
          shopping_mall_order_id: order.id,
          tracking_number: trackingNumber,
          carrier_name: carrierName,
          shipping_status: shippingStatus,
          shipped_at: shippedAt,
          delivered_at: shippingStatus === "delivered" ? shippedAt : null,
          deleted_at: null,
        } satisfies IShoppingMallShipmentTracking.ICreate,
      },
    );
  typia.assert(shipmentTracking);

  // 11. Assertions
  TestValidator.equals(
    "shipmentTracking.orderId matches order.id",
    shipmentTracking.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "shipmentTracking.trackingNumber matches input",
    shipmentTracking.tracking_number,
    trackingNumber,
  );
  TestValidator.equals(
    "shipmentTracking.carrierName matches input",
    shipmentTracking.carrier_name,
    carrierName,
  );
  TestValidator.equals(
    "shipmentTracking.shippingStatus matches input",
    shipmentTracking.shipping_status,
    shippingStatus,
  );
  TestValidator.equals(
    "shipmentTracking.shippedAt matches input",
    shipmentTracking.shipped_at,
    shippedAt,
  );
  if (shippingStatus === "delivered") {
    TestValidator.predicate(
      "shipmentTracking.deliveredAt is not null",
      shipmentTracking.delivered_at !== null,
    );
  } else {
    TestValidator.equals(
      "shipmentTracking.deliveredAt is null",
      shipmentTracking.delivered_at,
      null,
    );
  }
}

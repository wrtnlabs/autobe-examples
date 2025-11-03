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

export async function test_api_shipment_tracking_deletion_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registration and login
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "sellerspass",
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateBody,
  });
  typia.assert(seller);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerCreateBody.email,
      password: sellerCreateBody.password,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 2. Customer registration and login
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "customerpass",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerCreateBody,
  });
  typia.assert(customer);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerCreateBody.email,
      password: customerCreateBody.password,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 3. Seller creates a product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerCreateBody.email,
      password: sellerCreateBody.password,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    brand: "TestBrand",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert(product);

  // 4. Customer places an order for products
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerCreateBody.email,
      password: customerCreateBody.password,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  const orderCreateBody = {
    order_code: `ORD-${RandomGenerator.alphaNumeric(8)}`,
    shipping_address: RandomGenerator.paragraph({ sentences: 4 }),
    shopping_mall_order_items: [
      {
        shopping_mall_product_sku_id: product.shopping_mall_product_skus
          ? product.shopping_mall_product_skus[0].id
          : "00000000-0000-0000-0000-000000000000",
        quantity: 1,
        unit_price: product.shopping_mall_product_skus
          ? product.shopping_mall_product_skus[0].price
          : 1000,
        total_price: product.shopping_mall_product_skus
          ? product.shopping_mall_product_skus[0].price
          : 1000,
      },
    ],
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderCreateBody },
  );
  typia.assert(order);

  // 5. Seller creates a shipment tracking record linked to the order
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerCreateBody.email,
      password: sellerCreateBody.password,
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const shipmentTrackingCreateBody = {
    shopping_mall_order_id: order.id,
    tracking_number: `TRK-${RandomGenerator.alphaNumeric(10)}`,
    carrier_name: "UPS",
    shipping_status: "shipped",
    shipped_at: new Date().toISOString(),
    delivered_at: null,
  } satisfies IShoppingMallShipmentTracking.ICreate;

  const shipmentTracking =
    await api.functional.shoppingMall.seller.shipmentTrackings.create(
      connection,
      { body: shipmentTrackingCreateBody },
    );
  typia.assert(shipmentTracking);

  // 6. Seller deletes the shipment tracking record
  await api.functional.shoppingMall.seller.shipmentTrackings.eraseShipmentTracking(
    connection,
    { id: shipmentTracking.id },
  );

  // 7. Validate deletion by attempting to delete again and expect error
  await TestValidator.error(
    "deleting already deleted shipment tracking should fail",
    async () => {
      await api.functional.shoppingMall.seller.shipmentTrackings.eraseShipmentTracking(
        connection,
        { id: shipmentTracking.id },
      );
    },
  );
}

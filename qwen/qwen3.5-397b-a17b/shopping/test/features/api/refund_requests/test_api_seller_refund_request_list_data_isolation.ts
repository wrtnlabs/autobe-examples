import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
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
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller refund request list data isolation.
 *
 * This test validates that sellers can only view refund requests for order items they sold.
 * It ensures proper data isolation between sellers in the refund request listing endpoint.
 *
 * Test flow:
 * 1. Create two seller accounts (Seller A and Seller B)
 * 2. Create one customer account
 * 3. Each seller creates a product with variant
 * 4. Customer places orders with products from both sellers
 * 5. Sellers ship their respective order items
 * 6. Customer confirms delivery for both shipments
 * 7. Customer submits refund requests for items from both sellers
 * 8. Verify Seller A only sees refund requests for their own items
 * 9. Verify Seller B only sees refund requests for their own items
 */
export async function test_api_seller_refund_request_list_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // 1. Create Seller A account and login
  // ============================================
  const sellerACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Test1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: sellerACredentials,
  });
  const sellerAConnection2: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_login(sellerAConnection2, {
    body: {
      email: sellerACredentials.email,
      password: sellerACredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerAAuth);
  // ============================================
  // 2. Create Seller B account and login
  // ============================================
  const sellerBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Test1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: sellerBCredentials,
  });
  const sellerBConnection2: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_login(sellerBConnection2, {
    body: {
      email: sellerBCredentials.email,
      password: sellerBCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerBAuth);
  // ============================================
  // 3. Create Customer account and login
  // ============================================
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Test1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  const customerConnection2: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_login(customerConnection2, {
    body: {
      email: customerCredentials.email,
      password: customerCredentials.password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customerAuth);
  // ============================================
  // 4. Seller A creates product with variant
  // ============================================
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection2,
    {},
  );
  typia.assert(productA);
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection2,
      {
        params: { productId: productA.id },
        body: {
          sku_code: `SKU-A-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [],
        },
      },
    );
  typia.assert(variantA);
  // ============================================
  // 5. Seller B creates product with variant
  // ============================================
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection2,
    {},
  );
  typia.assert(productB);
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection2,
      {
        params: { productId: productB.id },
        body: {
          sku_code: `SKU-B-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [],
        },
      },
    );
  typia.assert(variantB);
  // ============================================
  // 6. Customer places order with Seller A's product
  // ============================================
  const orderA = await generate_random_shopping_mall_customer_orders_create(
    customerConnection2,
    {},
  );
  typia.assert(orderA);
  // ============================================
  // 7. Customer places order with Seller B's product
  // ============================================
  const orderB = await generate_random_shopping_mall_customer_orders_create(
    customerConnection2,
    {},
  );
  typia.assert(orderB);
  // ============================================
  // 8. Seller A ships their order item
  // ============================================
  const orderItemA = orderA.orderItems[0];
  const shipmentA = await generate_random_shopping_mall_seller_shipments_create(
    sellerAConnection2,
    {
      body: {
        tracking_carrier: "FedEx",
        tracking_number: `TRACK-A-${RandomGenerator.alphaNumeric(12)}`,
        order_item_ids: [orderItemA.id],
      },
    },
  );
  typia.assert(shipmentA);
  // ============================================
  // 9. Seller B ships their order item
  // ============================================
  const orderItemB = orderB.orderItems[0];
  const shipmentB = await generate_random_shopping_mall_seller_shipments_create(
    sellerBConnection2,
    {
      body: {
        tracking_carrier: "UPS",
        tracking_number: `TRACK-B-${RandomGenerator.alphaNumeric(12)}`,
        order_item_ids: [orderItemB.id],
      },
    },
  );
  typia.assert(shipmentB);
  // ============================================
  // 10. Customer confirms delivery for both shipments
  // ============================================
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customerConnection2,
    {
      shipmentId: shipmentA.id,
    },
  );
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customerConnection2,
    {
      shipmentId: shipmentB.id,
    },
  );
  // ============================================
  // 11. Customer submits refund request for Seller A's item
  // ============================================
  const refundRequestA =
    await generate_random_shopping_mall_customer_order_items_refund_requests_create(
      customerConnection2,
      {
        params: { orderItemId: orderItemA.id },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequestA);
  // ============================================
  // 12. Customer submits refund request for Seller B's item
  // ============================================
  const refundRequestB =
    await generate_random_shopping_mall_customer_order_items_refund_requests_create(
      customerConnection2,
      {
        params: { orderItemId: orderItemB.id },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequestB);
  // ============================================
  // 13. Seller A queries refund requests - should only see their own
  // ============================================
  const sellerARefundRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerAConnection2,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(sellerARefundRequests);
  // ============================================
  // 14. Seller B queries refund requests - should only see their own
  // ============================================
  const sellerBRefundRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerBConnection2,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(sellerBRefundRequests);
  // ============================================
  // 15. Validate data isolation
  // ============================================
  // Seller A should only see refund request A
  TestValidator.equals(
    "Seller A refund request count",
    sellerARefundRequests.data.length,
    1,
  );
  TestValidator.equals(
    "Seller A sees own refund request",
    sellerARefundRequests.data[0].id,
    refundRequestA.id,
  );
  TestValidator.equals(
    "Seller A refund request seller ID",
    sellerARefundRequests.data[0].orderItem.seller.id,
    sellerAAuth.id,
  );
  // Seller B should only see refund request B
  TestValidator.equals(
    "Seller B refund request count",
    sellerBRefundRequests.data.length,
    1,
  );
  TestValidator.equals(
    "Seller B sees own refund request",
    sellerBRefundRequests.data[0].id,
    refundRequestB.id,
  );
  TestValidator.equals(
    "Seller B refund request seller ID",
    sellerBRefundRequests.data[0].orderItem.seller.id,
    sellerBAuth.id,
  );
  // Verify complete isolation - sellers don't see each other's refund requests
  TestValidator.predicate(
    "Seller A does not see Seller B's refund request",
    !sellerARefundRequests.data.some((req) => req.id === refundRequestB.id),
  );
  TestValidator.predicate(
    "Seller B does not see Seller A's refund request",
    !sellerBRefundRequests.data.some((req) => req.id === refundRequestA.id),
  );
}

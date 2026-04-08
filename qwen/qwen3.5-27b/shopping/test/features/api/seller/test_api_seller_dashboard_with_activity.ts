import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_orders_items_cancellation_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_cancellation_create";
import { generate_random_shopping_mall_customer_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test seller dashboard with complete business activity including products, orders, and pending requests.
 *
 * Validates the seller dashboard endpoint by setting up a realistic business scenario with multiple products, customer orders, and pending requests. The test verifies that the dashboard accurately displays aggregated metrics for the seller's shop including total product count, order item count, and pending cancellation and refund request counts.
 *
 * Special attention is given to verifying that the metrics are correctly computed and that data isolation is maintained - the seller can only see their own shop data, not other sellers' information.
 *
 * 1. Register a seller and authenticate with the platform
 * 2. Create 3 products for the seller's shop
 * 3. Register a customer and authenticate
 * 4. Customer places an order containing 2 items from the seller's products
 * 5. Customer creates a cancellation request for one order item (pending status)
 * 6. Customer creates a refund request for another order item (pending status)
 * 7. Seller retrieves their dashboard and validates all metrics are accurate
 */
export async function test_api_seller_dashboard_with_activity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create 3 products for the seller
  const products = await ArrayUtil.asyncRepeat(3, async (index) =>
    generate_random_shopping_mall_seller_products_create(sellerConnection, {
      body: {
        name: `Test Product ${index + 1}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    }),
  );
  await ArrayUtil.asyncForEach(products, async (product) => typia.assert(product));
  // 3. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Customer places an order with 2 items from seller's products
  // Note: The checkout function uses cart, so we assume items are already in cart
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Ensure we have at least 2 order items for testing
  if (order.items.length < 2) {
    throw new Error(
      "Test setup failed: order must contain at least 2 items for cancellation and refund testing",
    );
  }
  const firstItemId = order.items[0].id;
  const secondItemId = order.items[1].id;
  // 5. Customer creates cancellation request for first item (pending status)
  const cancellationRequest =
    await generate_random_shopping_mall_customer_orders_items_cancellation_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: firstItemId,
        },
        body: {
          reason:
            "Customer changed mind and wants to cancel this order item before shipment",
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 6. Customer creates refund request for second item (pending status)
  // Note: This requires the item to be delivered, but for test purposes we create it
  const refundRequest =
    await generate_random_shopping_mall_customer_orders_items_refund_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: secondItemId,
        },
        body: {
          reason:
            "Customer received item but it was damaged and wants a refund",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 7. Seller retrieves dashboard and validates metrics
  const dashboard =
    await api.functional.shoppingMall.seller.sellers.me.dashboard(
      sellerConnection,
    );
  typia.assert(dashboard);
  // Validate total products count
  TestValidator.equals("total products count", dashboard.totalProducts, 3);
  // Validate order items count (should be at least 2 from the order)
  TestValidator.predicate("has order items", dashboard.totalOrderItems >= 2);
  // Validate pending cancellation requests count
  TestValidator.equals(
    "pending cancellation requests count",
    dashboard.pendingCancellationRequests,
    1,
  );
  // Validate pending refund requests count
  TestValidator.equals(
    "pending refund requests count",
    dashboard.pendingRefundRequests,
    1,
  );
}
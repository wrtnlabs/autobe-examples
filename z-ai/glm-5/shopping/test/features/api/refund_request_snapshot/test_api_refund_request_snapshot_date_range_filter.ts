import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_refund_request_snapshot_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Create customer address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // Add item to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // Checkout
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Create shipment - use prepare function to handle order_item_ids
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order.id,
        carrier_name: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(10),
      },
    },
  );
  typia.assert(shipment);
  // Confirm delivery
  const deliveredShipment =
    await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveredShipment);
  // Create first refund request using the order item from shipment
  const refundRequest1 =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: deliveredShipment.orderItems[0].id,
          reason:
            "Product does not match description. The color is different from what was shown in the product images online.",
        },
      },
    );
  typia.assert(refundRequest1);
  // Seller responds to first refund request (creates first snapshot)
  const firstSnapshotTime = new Date();
  const updatedRefundRequest1 =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest1.id,
        body: {
          decision: "approve",
        },
      },
    );
  typia.assert(updatedRefundRequest1);
  // Wait for time interval to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Create second product and variant for second refund flow
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
      },
    );
  typia.assert(variant2);
  // Add second item to cart
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant2.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  // Second checkout
  const order2 = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        address_id: address.id,
      },
    },
  );
  typia.assert(order2);
  // Create second shipment
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order2.id,
        carrier_name: "UPS",
        tracking_number: RandomGenerator.alphaNumeric(10),
      },
    },
  );
  typia.assert(shipment2);
  // Confirm second delivery
  const deliveredShipment2 =
    await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment2.id,
      },
    );
  typia.assert(deliveredShipment2);
  // Create second refund request
  const refundRequest2 =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: deliveredShipment2.orderItems[0].id,
          reason:
            "Product arrived damaged during shipping. The packaging was insufficient and the item was broken upon arrival.",
        },
      },
    );
  typia.assert(refundRequest2);
  // Seller responds to second refund request (creates second snapshot)
  const secondSnapshotTime = new Date();
  const updatedRefundRequest2 =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest2.id,
        body: {
          decision: "reject",
        },
      },
    );
  typia.assert(updatedRefundRequest2);
  // Query snapshots with date range that includes both snapshots
  const allSnapshotsPage =
    await api.functional.shoppingMall.seller.refund_request_snapshots.index(
      sellerConnection,
      {
        body: {
          from: firstSnapshotTime.toISOString(),
          to: new Date(Date.now() + 60000).toISOString(),
          limit: 100,
        },
      },
    );
  typia.assert(allSnapshotsPage);
  TestValidator.predicate(
    "should have at least 2 snapshots",
    allSnapshotsPage.data.length >= 2,
  );
  // Query with date range that should exclude second snapshot
  const earlierSnapshotsPage =
    await api.functional.shoppingMall.seller.refund_request_snapshots.index(
      sellerConnection,
      {
        body: {
          from: firstSnapshotTime.toISOString(),
          to: new Date(firstSnapshotTime.getTime() + 50).toISOString(),
          limit: 100,
        },
      },
    );
  typia.assert(earlierSnapshotsPage);
  TestValidator.predicate(
    "earlier query should have fewer results",
    earlierSnapshotsPage.data.length < allSnapshotsPage.data.length,
  );
  // Verify snapshots within range have correct timestamps
  for (const snapshot of earlierSnapshotsPage.data) {
    const createdAt = new Date(snapshot.created_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} should be within date range`,
      createdAt >= firstSnapshotTime &&
        createdAt <= new Date(firstSnapshotTime.getTime() + 50),
    );
  }
}

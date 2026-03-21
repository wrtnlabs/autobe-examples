import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_orders_items_review_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_review_multiple_edits_preserve_all_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register seller and customer
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 2. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller creates variant
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Seller adds inventory
  const inventory =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      { params: { productId: product.id, variantId: variant.id } },
    );
  typia.assert(inventory);
  // 5. Customer adds item to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { variant_id: variant.id, quantity: 1 },
      },
    );
  typia.assert(cartItem);
  // 6. Customer prepares checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // 7. Customer confirms checkout
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: { payment_token: "test_token_123" },
      },
    );
  typia.assert(order);
  const orderItemId = order.orderItems[0]!.id;
  const shipmentId = order.shipments[0]!.id;
  // 8. Seller ships order
  await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItemId],
        carrier: "FastShip",
        trackingNumber: "TRACK123456",
      },
    },
  );
  // 9. Customer confirms delivery
  const shipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { orderId: order.id, shipmentId },
    );
  typia.assert(shipment);
  // 10. Customer creates initial review with 3-star rating
  const initialReview =
    await generate_random_ecommerce_mall_customer_customers_orders_items_review_create(
      customerConnection,
      {
        params: { orderId: order.id, itemId: orderItemId },
        body: { rating: 3, content: "Initial review content" },
      },
    );
  typia.assert(initialReview);
  // Validate initial review has no snapshots
  TestValidator.equals(
    "initial review has 0 snapshots",
    initialReview.reviewSnapshots.length,
    0,
  );
  TestValidator.equals("initial rating is 3", initialReview.rating, 3);
  // 11. First update: 3 → 4 stars
  const firstUpdate =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: { rating: 4, content: "First update content" },
      },
    );
  typia.assert(firstUpdate);
  // Validate first update: 1 snapshot with original 3-star rating
  TestValidator.equals(
    "first update has 1 snapshot",
    firstUpdate.reviewSnapshots.length,
    1,
  );
  TestValidator.equals(
    "first snapshot rating is 3",
    firstUpdate.reviewSnapshots[0]!.rating,
    3,
  );
  TestValidator.equals(
    "first snapshot body preserved",
    firstUpdate.reviewSnapshots[0]!.body,
    "Initial review content",
  );
  TestValidator.equals("current rating is 4", firstUpdate.rating, 4);
  TestValidator.equals(
    "current content is first update",
    firstUpdate.content,
    "First update content",
  );
  // Store timestamps for chronological validation
  const firstSnapshotTime = new Date(
    firstUpdate.reviewSnapshots[0]!.created_at,
  ).getTime();
  // 12. Second update: 4 → 5 stars
  const secondUpdate =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: { rating: 5, content: "Second update content" },
      },
    );
  typia.assert(secondUpdate);
  // Validate second update: 2 snapshots (ratings: 3, 4)
  TestValidator.equals(
    "second update has 2 snapshots",
    secondUpdate.reviewSnapshots.length,
    2,
  );
  TestValidator.equals(
    "first snapshot rating is 3",
    secondUpdate.reviewSnapshots[0]!.rating,
    3,
  );
  TestValidator.equals(
    "second snapshot rating is 4",
    secondUpdate.reviewSnapshots[1]!.rating,
    4,
  );
  TestValidator.equals(
    "first snapshot preserved",
    secondUpdate.reviewSnapshots[0]!.body,
    "Initial review content",
  );
  TestValidator.equals(
    "second snapshot preserved",
    secondUpdate.reviewSnapshots[1]!.body,
    "First update content",
  );
  TestValidator.equals("current rating is 5", secondUpdate.rating, 5);
  const secondSnapshotTime = new Date(
    secondUpdate.reviewSnapshots[1]!.created_at,
  ).getTime();
  // Validate chronological order
  TestValidator.predicate(
    "first snapshot time before second",
    firstSnapshotTime < secondSnapshotTime,
  );
  // 13. Third update: 5 → 2 stars (final)
  const finalReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: { rating: 2, content: "Final update content" },
      },
    );
  typia.assert(finalReview);
  // Validate third update: 3 snapshots (ratings: 3, 4, 5)
  TestValidator.equals(
    "third update has 3 snapshots",
    finalReview.reviewSnapshots.length,
    3,
  );
  TestValidator.equals(
    "first snapshot rating is 3",
    finalReview.reviewSnapshots[0]!.rating,
    3,
  );
  TestValidator.equals(
    "second snapshot rating is 4",
    finalReview.reviewSnapshots[1]!.rating,
    4,
  );
  TestValidator.equals(
    "third snapshot rating is 5",
    finalReview.reviewSnapshots[2]!.rating,
    5,
  );
  TestValidator.equals(
    "first snapshot content preserved",
    finalReview.reviewSnapshots[0]!.body,
    "Initial review content",
  );
  TestValidator.equals(
    "second snapshot content preserved",
    finalReview.reviewSnapshots[1]!.body,
    "First update content",
  );
  TestValidator.equals(
    "third snapshot content preserved",
    finalReview.reviewSnapshots[2]!.body,
    "Second update content",
  );
  TestValidator.equals("final rating is 2", finalReview.rating, 2);
  TestValidator.equals(
    "final content is third update",
    finalReview.content,
    "Final update content",
  );
  // Validate all timestamps are in chronological order
  const thirdSnapshotTime = new Date(
    finalReview.reviewSnapshots[2]!.created_at,
  ).getTime();
  TestValidator.predicate(
    "timestamps are chronological order",
    firstSnapshotTime < secondSnapshotTime &&
      secondSnapshotTime < thirdSnapshotTime,
  );
}

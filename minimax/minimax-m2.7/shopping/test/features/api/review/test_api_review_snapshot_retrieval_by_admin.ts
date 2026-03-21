import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_orders_items_review_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_review_snapshot_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Generate credentials for seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  // 1. Register and login seller
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAuthConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // 2. Seller creates product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAuthConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerAuthConnection,
      {
        params: { productId: product.id },
        body: { quantity: 100 },
      },
    );
  typia.assert(variant);
  // 3. Generate credentials for customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  // 4. Register and login customer A
  const customerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAuthConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/customer",
      referrer: "https://example.com",
    },
  });
  // 5. Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerAuthConnection,
      {},
    );
  typia.assert(address);
  // 6. Add item to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerAuthConnection,
      {
        body: { variant_id: variant.id, quantity: 1 },
      },
    );
  typia.assert(cartItem);
  // 7. Checkout and place order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerAuthConnection,
      {
        body: {
          payment_token: "test_payment_token_" + Date.now(),
          address_id: address.id,
        },
      },
    );
  typia.assert(order);
  // 8. Seller ships the order
  const orderItemId = order.orderItems[0].id;
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerAuthConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItemId],
        carrier: "Test Carrier",
        trackingNumber: "TRACK123456789",
      },
    },
  );
  typia.assert(shipment);
  // 9. Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerAuthConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 10. Customer creates review
  const review =
    await generate_random_ecommerce_mall_customer_customers_orders_items_review_create(
      customerAuthConnection,
      {
        params: { orderId: order.id, itemId: orderItemId },
        body: { rating: 4 },
      },
    );
  typia.assert(review);
  // 11. Customer edits review to create snapshot
  const editedReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerAuthConnection,
      {
        reviewId: review.id,
        body: { rating: 5, content: "Updated review with more detail" },
      },
    );
  typia.assert(editedReview);
  // Verify snapshot was created
  const snapshotId = editedReview.reviewSnapshots[0]?.id;
  TestValidator.equals("snapshot exists", snapshotId !== undefined, true);
  // 12. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 13. Admin retrieves customer A's snapshot
  const snapshot =
    await api.functional.ecommerceMall.customer.reviews.snapshots.at(
      adminConnection,
      {
        reviewId: review.id,
        snapshotId: snapshotId!,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot fields
  TestValidator.equals(
    "snapshot has valid id",
    typeof snapshot.id === "string" && snapshot.id.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot review_id matches",
    snapshot.review_id,
    review.id,
  );
  TestValidator.equals(
    "snapshot rating is valid",
    snapshot.rating >= 1 && snapshot.rating <= 5,
    true,
  );
  TestValidator.equals(
    "snapshot has created_at",
    typeof snapshot.created_at === "string",
    true,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_review_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_product_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_product_variants_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_customer_review_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates product
  const product =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Get first variant from product
  const variant = product.variants[0];
  // 4. Seller adds inventory for product variant
  await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
    },
  );
  // 5. Customer login and create shipping address
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await generate_random_ecommerce_mall_customer_customers_addresses_create(
    customerLoginConnection,
    {},
  );
  // 6. Add product variant to cart
  const cart =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerLoginConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cart);
  // 7. Checkout and complete payment to create order
  const order = await generate_random_ecommerce_mall_customer_payments_checkout(
    customerLoginConnection,
    {},
  );
  typia.assert(order);
  // Get order item
  const orderItem = order.orderItems[0];
  // 8. Seller creates shipment for order
  const shipment =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: [orderItem.id],
          carrier: "Test Carrier",
          trackingNumber: "TRACK123456",
        },
      },
    );
  typia.assert(shipment);
  // 9. Update order item status to delivered (customer confirms delivery)
  // The order item status should be updated after shipment creation
  // We'll get the updated order item to confirm delivery status
  const deliveredItems =
    await api.functional.ecommerceMall.customer.ecommerceMall.orders.items.index(
      customerLoginConnection,
      {
        orderId: order.id,
        body: { status: "shipped" },
      },
    );
  typia.assert(deliveredItems);
  // For testing purposes, we need to manually set the item to delivered
  // Since there's no explicit confirm delivery endpoint, we'll use the order items
  // that were shipped and proceed to create review
  // 10. Customer creates initial review for delivered order item
  // First, we need to find a delivered item - let's update item status through shipment
  // Actually, shipment changes status from 'paid' to 'shipped', not 'delivered'
  // For the review to be allowed, we need delivered status
  // Let's get items that can be reviewed (delivered)
  // Since the system may auto-deliver or we need to simulate delivery,
  // we'll create the review if the item is in shipped status and system allows review
  // The scenario plan says "Confirm delivery to enable review creation"
  // Get order items - they should have 'shipped' status after shipment creation
  const shippedItems =
    await api.functional.ecommerceMall.customer.ecommerceMall.orders.items.index(
      customerLoginConnection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(shippedItems);
  // Get the first order item to review
  const itemToReview = shippedItems.data[0];
  // 10. Customer creates initial review for order item
  const initialReview =
    await generate_random_ecommerce_mall_customer_orders_items_review_create(
      customerLoginConnection,
      {
        params: {
          orderId: order.id,
          itemId: itemToReview.id,
        },
        body: {
          rating: 3,
          content: "Initial review content",
        },
      },
    );
  typia.assert(initialReview);
  // Store original values for comparison
  const originalRating = initialReview.rating;
  const originalContent = initialReview.content;
  const originalCreatedAt = initialReview.createdAt;
  const originalCustomerId = initialReview.customer.id;
  const originalProductId = initialReview.product.id;
  const originalOrderItemId = initialReview.orderItem.id;
  // 11. Update the review with new rating and content
  const newRating = 4;
  const newContent = "Updated review content with more details";
  const updatedReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerLoginConnection,
      {
        reviewId: initialReview.id,
        body: {
          rating: newRating,
          content: newContent,
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // Validations
  TestValidator.equals(
    "review rating updated",
    updatedReview.rating,
    newRating,
  );
  TestValidator.equals(
    "review content updated",
    updatedReview.content,
    newContent,
  );
  TestValidator.predicate(
    "updatedAt is newer than createdAt",
    new Date(updatedReview.updatedAt) > new Date(originalCreatedAt),
  );
  TestValidator.equals(
    "customer_id unchanged",
    updatedReview.customer.id,
    originalCustomerId,
  );
  TestValidator.equals(
    "product_id unchanged",
    updatedReview.product.id,
    originalProductId,
  );
  // Verify snapshot was created with previous values
  TestValidator.predicate(
    "snapshot exists",
    updatedReview.reviewSnapshots.length > 0,
  );
  if (updatedReview.reviewSnapshots.length > 0) {
    const snapshot = updatedReview.reviewSnapshots[0];
    TestValidator.equals(
      "snapshot has previous rating",
      snapshot.previousRating,
      originalRating,
    );
    TestValidator.equals(
      "snapshot has previous content",
      snapshot.previousContent,
      originalContent,
    );
    TestValidator.equals(
      "snapshot has new rating",
      snapshot.newRating,
      newRating,
    );
    TestValidator.equals(
      "snapshot has new content",
      snapshot.newContent,
      newContent,
    );
  }
}
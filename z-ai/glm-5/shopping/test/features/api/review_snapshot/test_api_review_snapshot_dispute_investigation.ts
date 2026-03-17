import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_review_snapshot_dispute_investigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Administrator creates product category
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Seller creates product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          basePrice: 50000,
        },
      },
    );
  typia.assert(product);
  // 5. Seller adds inventory to first variant
  const variant = product.variants[0];
  if (variant === undefined) {
    throw new Error("Product has no variants");
  }
  await generate_random_shopping_mall_seller_variants_inventory_adjust(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: { quantity_change: 100, reason: "Initial stock" },
    },
  );
  // 6. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Customer adds shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 8. Customer adds product to cart
  await generate_random_shopping_mall_customer_customers_cart_items_create(
    customerConnection,
    {
      body: {
        variantId: variant.id,
        quantity: 1,
      },
    },
  );
  // 9. Customer completes checkout
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: { addressId: address.id },
    },
  );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  if (orderItem === undefined) {
    throw new Error("Order has no items");
  }
  // 10. Seller creates shipment for order fulfillment
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderId: order.id,
          orderItemIds: [orderItem.id],
          carrierName: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 11. Customer confirms delivery to enable review creation
  await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    { shipmentId: shipment.id },
  );
  // 12. Customer creates initial review (rating=3, specific content)
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItem: orderItem.id,
        rating: 3,
        content: "Initial review content - average product",
      },
    },
  );
  typia.assert(review);
  // 13. Customer edits review first time (creates snapshot 1 preserving original state)
  await api.functional.shoppingMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: 4,
        content: "Updated review - better than expected",
      },
    },
  );
  // 14. Customer edits review second time (creates snapshot 2 preserving first edit state)
  await api.functional.shoppingMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: 5,
        content: "Final update - excellent product, highly recommended",
      },
    },
  );
  // 15. Administrator retrieves snapshots for dispute investigation
  const snapshots =
    await api.functional.shoppingMall.administrator.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(snapshots);
  // 16. Validate pagination metadata shows correct values
  TestValidator.equals("current page", snapshots.pagination.current, 1);
  TestValidator.equals("limit", snapshots.pagination.limit, 10);
  TestValidator.predicate(
    "total records >= 2",
    snapshots.pagination.records >= 2,
  );
  TestValidator.predicate("total pages >= 1", snapshots.pagination.pages >= 1);
  // 17. Validate at least 2 snapshots exist from the edits
  TestValidator.predicate("snapshots count >= 2", snapshots.data.length >= 2);
  // 18. Validate snapshots are ordered chronologically (oldest first - created_at ascending)
  for (let i = 1; i < snapshots.data.length; i++) {
    const prev = snapshots.data[i - 1];
    const curr = snapshots.data[i];
    if (prev !== undefined && curr !== undefined) {
      TestValidator.predicate(
        "snapshots chronologically ordered",
        new Date(prev.created_at) <= new Date(curr.created_at),
      );
    }
  }
  // 19. Validate first snapshot preserves original review state (before first edit)
  const firstSnapshot = snapshots.data[0];
  if (firstSnapshot !== undefined) {
    TestValidator.equals("first snapshot rating", firstSnapshot.rating, 3);
    TestValidator.equals(
      "first snapshot content",
      firstSnapshot.content,
      "Initial review content - average product",
    );
  }
  // 20. Validate second snapshot preserves first edit state (before second edit)
  const secondSnapshot = snapshots.data[1];
  if (secondSnapshot !== undefined) {
    TestValidator.equals("second snapshot rating", secondSnapshot.rating, 4);
    TestValidator.equals(
      "second snapshot content",
      secondSnapshot.content,
      "Updated review - better than expected",
    );
  }
}

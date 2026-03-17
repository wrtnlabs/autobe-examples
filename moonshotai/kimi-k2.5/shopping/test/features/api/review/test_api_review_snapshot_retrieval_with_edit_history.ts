import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test that an administrator can successfully retrieve the complete snapshot history
 * for a review that has been edited multiple times.
 *
 * This test validates that:
 * 1. Review snapshots are created on each edit operation
 * 2. Snapshots are ordered by createdAt DESC (newest first)
 * 3. Snapshots capture the review state BEFORE each edit
 * 4. Snapshots contain correct rating and content values
 * 5. Response structure matches IEcommerceMallReviewSnapshot schema
 */
export async function test_api_review_snapshot_retrieval_with_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Setup customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Admin creates a product category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 5. Seller creates a product with category assignment
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  // 6. Seller creates a product variant with sufficient stock
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          stock: 100,
        },
      },
    );
  // 7. Customer adds variant to shopping cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 8. Customer proceeds to checkout and creates order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the order item ID for shipment and review
  const orderItemId = (order.orderItems[0] as IEntity).id;
  // 9. Seller creates shipment for the order item
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItemId],
        carrierName: "FedEx",
        trackingNumber: "TRACK001",
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  // 10. Customer confirms delivery of the shipment
  await api.functional.ecommerceMall.customer.shipments.delivery.confirm.confirmDelivery(
    customerConnection,
    {
      shipmentId: shipment.id,
    },
  );
  // 11. Customer creates initial review for delivered item
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        order_item_id: orderItemId,
        rating: 4,
        content: "Great product",
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  // 12. Customer updates review - first edit (creates first snapshot of original state)
  await api.functional.ecommerceMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: 5,
        content: "Excellent product after more use",
      } satisfies IEcommerceMallReview.IUpdate,
    },
  );
  // 13. Customer updates review again - second edit (creates second snapshot of previous state)
  await api.functional.ecommerceMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: 5,
        content: "Still excellent, highly recommend",
      } satisfies IEcommerceMallReview.IUpdate,
    },
  );
  // 14. Admin retrieves review snapshots
  const snapshots =
    ((await api.functional.ecommerceMall.admin.reviews.snapshots.at(
      adminConnection,
      {
        reviewId: review.id,
      },
    )) as unknown) as IEcommerceMallReviewSnapshot[];
  // 15. Validate response structure
  typia.assert(snapshots);
  // Validate array contains exactly 2 snapshots (one for each edit)
  TestValidator.equals("snapshot count is 2", snapshots.length, 2);
  // Validate snapshots are ordered by createdAt DESC (newest first)
  const firstSnapshot = snapshots[0];
  const secondSnapshot = snapshots[1];
  TestValidator.predicate("snapshots ordered by createdAt DESC", () => {
    const firstTime = new Date(firstSnapshot.createdAt).getTime();
    const secondTime = new Date(secondSnapshot.createdAt).getTime();
    return firstTime >= secondTime;
  });
  // Validate first snapshot (newest) contains state before second edit
  TestValidator.equals("first snapshot rating", firstSnapshot.rating, 5);
  TestValidator.equals(
    "first snapshot content",
    firstSnapshot.content,
    "Excellent product after more use",
  );
  // Validate second snapshot contains state before first edit
  TestValidator.equals("second snapshot rating", secondSnapshot.rating, 4);
  TestValidator.equals(
    "second snapshot content",
    secondSnapshot.content,
    "Great product",
  );
  // Validate each snapshot has valid UUID and ISO timestamp (via typia.assert already done)
  TestValidator.predicate("first snapshot has valid UUID", () =>
    typia.is<string & tags.Format<"uuid">>(firstSnapshot.id),
  );
  TestValidator.predicate("second snapshot has valid UUID", () =>
    typia.is<string & tags.Format<"uuid">>(secondSnapshot.id),
  );
}
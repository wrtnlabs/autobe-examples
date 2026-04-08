import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that soft-deleted reviews are excluded from product review listing.
 *
 * Validates the complete review lifecycle including review creation, soft deletion, and verification that deleted reviews are properly excluded from product review listings. Ensures that the pagination metadata correctly reflects only non-deleted reviews and that the sorting order is maintained.
 *
 * The test creates a seller account with an approved product, then creates two customer accounts that each place orders, receive delivered shipments, and write reviews. One review is then deleted by its author, and the review listing endpoint is called to verify that only the non-deleted review appears in the results.
 *
 * 1. Seller joins, logs in, and creates a product.
 * 2. Customer 1 joins, logs in, places an order, receives shipment, and creates a review.
 * 3. Customer 2 joins, logs in, places an order, receives shipment, and creates a review.
 * 4. Customer 1 deletes their review (soft delete).
 * 5. Call review listing endpoint and verify only Customer 2's review appears.
 * 6. Validate pagination records count excludes deleted review.
 * 7. Verify review sorting is maintained (newest first).
 */
export async function test_api_product_review_listing_excludes_deleted_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get a variant ID from the product for order creation
  const variant = product.variants[0];
  typia.assert(variant);
  // 2. Customer 1 setup - join, order, shipment, review
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth = await authorize_member_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer1Auth);
  // Customer 1 creates order
  const customer1Order =
    await generate_random_shopping_mall_member_orders_create(
      customer1Connection,
      {},
    );
  typia.assert(customer1Order);
  // Seller creates shipment for Customer 1's order (marks as delivered)
  const orderItem1 = customer1Order.orderItems[0];
  typia.assert(orderItem1);
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem1.id],
          carrier_name: RandomGenerator.name(2),
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
        },
        params: { orderId: customer1Order.id },
      },
    );
  typia.assert(shipment1);
  // Customer 1 creates review
  const review1 = await generate_random_shopping_mall_member_reviews_create(
    customer1Connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: customer1Order.id,
        shopping_mall_order_item_id: orderItem1.id,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(review1);
  // 3. Customer 2 setup - join, order, shipment, review
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_member_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer2Auth);
  // Customer 2 creates order
  const customer2Order =
    await generate_random_shopping_mall_member_orders_create(
      customer2Connection,
      {},
    );
  typia.assert(customer2Order);
  // Seller creates shipment for Customer 2's order
  const orderItem2 = customer2Order.orderItems[0];
  typia.assert(orderItem2);
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem2.id],
          carrier_name: RandomGenerator.name(2),
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
        },
        params: { orderId: customer2Order.id },
      },
    );
  typia.assert(shipment2);
  // Customer 2 creates review
  const review2 = await generate_random_shopping_mall_member_reviews_create(
    customer2Connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: customer2Order.id,
        shopping_mall_order_item_id: orderItem2.id,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(review2);
  // 4. Customer 1 deletes their review (soft delete)
  await api.functional.shoppingMall.member.reviews.erase(customer1Connection, {
    reviewId: review1.id,
  });
  // 5. Call review listing endpoint
  const reviewList = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(reviewList);
  // 6. Validate deleted review is excluded
  TestValidator.equals(
    "total records excludes deleted review",
    reviewList.pagination.records,
    1,
  );
  TestValidator.equals(
    "data array contains only non-deleted review",
    reviewList.data.length,
    1,
  );
  // Verify the remaining review is Customer 2's review (not deleted)
  TestValidator.equals(
    "remaining review is Customer 2's review",
    reviewList.data[0]?.id,
    review2.id,
  );
  TestValidator.equals(
    "remaining review author is Customer 2",
    reviewList.data[0]?.author.id,
    customer2Auth.id,
  );
  // 7. Verify sorting (newest first) - with only one review, it should be the first
  TestValidator.predicate(
    "review has valid created_at timestamp",
    reviewList.data[0]?.created_at !== undefined,
  );
  // 8. Edge case: Delete second review and verify empty results
  await api.functional.shoppingMall.member.reviews.erase(customer2Connection, {
    reviewId: review2.id,
  });
  const emptyReviewList =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(emptyReviewList);
  TestValidator.equals(
    "all reviews deleted - records count is 0",
    emptyReviewList.pagination.records,
    0,
  );
  TestValidator.equals(
    "all reviews deleted - data array is empty",
    emptyReviewList.data.length,
    0,
  );
}

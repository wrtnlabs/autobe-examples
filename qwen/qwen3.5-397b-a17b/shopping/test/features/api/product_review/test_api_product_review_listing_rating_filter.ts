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
 * Test rating filter functionality for product review listing.
 *
 * Validates the complete review filtering workflow including seller product creation, multiple customer orders with deliveries, review creation with various ratings, and rating-based filter testing. Ensures that the rating_min and rating_max filters work correctly both individually and in combination.
 *
 * Special attention is given to verifying that filtered results maintain correct sorting (newest first), pagination metadata reflects filtered counts, and edge cases like no matching reviews or single-rating filters are handled properly.
 *
 * 1. Seller joins, logs in, and creates a product.
 * 2. Three customers join, place orders, and receive delivered shipments.
 * 3. Customers create reviews with 5-star, 3-star, and 1-star ratings respectively.
 * 4. Test high rating filter (rating_min=4, rating_max=5) returns only 5-star review.
 * 5. Test low rating filter (rating_min=1, rating_max=2) returns only 1-star review.
 * 6. Test single rating filter (rating_min=3, rating_max=3) returns only 3-star review.
 * 7. Test all reviews filter (rating_min=1, rating_max=5) returns all three reviews.
 * 8. Test no match filter (rating_min=4, rating_max=4) returns empty array.
 * 9. Verify pagination records count matches filtered results for each test.
 */
export async function test_api_product_review_listing_rating_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join and login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  // 2. Create three customers with orders and delivered shipments
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1Password = RandomGenerator.alphaNumeric(16);
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(customer1Connection, {
    body: {
      email: customer1Email,
      password: customer1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2Password = RandomGenerator.alphaNumeric(16);
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(customer2Connection, {
    body: {
      email: customer2Email,
      password: customer2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customer3Email = typia.random<string & tags.Format<"email">>();
  const customer3Password = RandomGenerator.alphaNumeric(16);
  const customer3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(customer3Connection, {
    body: {
      email: customer3Email,
      password: customer3Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create orders for each customer
  const order1 = await generate_random_shopping_mall_member_orders_create(
    customer1Connection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  const order2 = await generate_random_shopping_mall_member_orders_create(
    customer2Connection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  const order3 = await generate_random_shopping_mall_member_orders_create(
    customer3Connection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  // Extract order item IDs for shipments
  const orderItem1Id = order1.orderItems[0]?.id ?? "";
  const orderItem2Id = order2.orderItems[0]?.id ?? "";
  const orderItem3Id = order3.orderItems[0]?.id ?? "";
  // Create shipments to mark orders as shipped (will auto-deliver after 14 days or manual confirmation)
  if (orderItem1Id) {
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem1Id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
        params: { orderId: order1.id },
      },
    );
  }
  if (orderItem2Id) {
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem2Id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
        params: { orderId: order2.id },
      },
    );
  }
  if (orderItem3Id) {
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem3Id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
        params: { orderId: order3.id },
      },
    );
  }
  // 3. Create reviews with different ratings (5-star, 3-star, 1-star)
  if (orderItem1Id) {
    await generate_random_shopping_mall_member_reviews_create(
      customer1Connection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_order_id: order1.id,
          shopping_mall_order_item_id: orderItem1Id,
          rating: 5,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  }
  if (orderItem2Id) {
    await generate_random_shopping_mall_member_reviews_create(
      customer2Connection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_order_id: order2.id,
          shopping_mall_order_item_id: orderItem2Id,
          rating: 3,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  }
  if (orderItem3Id) {
    await generate_random_shopping_mall_member_reviews_create(
      customer3Connection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_order_id: order3.id,
          shopping_mall_order_item_id: orderItem3Id,
          rating: 1,
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  }
  // 4. Test high rating filter (4-5 stars) - should return only 5-star review
  const highRatingResult =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        rating_min: 4,
        rating_max: 5,
        page: 1,
        limit: 10,
      },
    });
  TestValidator.equals(
    "high rating filter count",
    highRatingResult.data.length,
    1,
  );
  TestValidator.equals(
    "high rating filter has 5-star",
    highRatingResult.data[0]?.rating,
    5,
  );
  TestValidator.equals(
    "high rating pagination records",
    highRatingResult.pagination.records,
    1,
  );
  // 5. Test low rating filter (1-2 stars) - should return only 1-star review
  const lowRatingResult =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        rating_min: 1,
        rating_max: 2,
        page: 1,
        limit: 10,
      },
    });
  TestValidator.equals(
    "low rating filter count",
    lowRatingResult.data.length,
    1,
  );
  TestValidator.equals(
    "low rating filter has 1-star",
    lowRatingResult.data[0]?.rating,
    1,
  );
  TestValidator.equals(
    "low rating pagination records",
    lowRatingResult.pagination.records,
    1,
  );
  // 6. Test single rating filter (3 stars only)
  const singleRatingResult =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        rating_min: 3,
        rating_max: 3,
        page: 1,
        limit: 10,
      },
    });
  TestValidator.equals(
    "single rating filter count",
    singleRatingResult.data.length,
    1,
  );
  TestValidator.equals(
    "single rating filter has 3-star",
    singleRatingResult.data[0]?.rating,
    3,
  );
  TestValidator.equals(
    "single rating pagination records",
    singleRatingResult.pagination.records,
    1,
  );
  // 7. Test all reviews filter (1-5 stars) - should return all three reviews
  const allReviewsResult =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        rating_min: 1,
        rating_max: 5,
        page: 1,
        limit: 10,
      },
    });
  TestValidator.equals(
    "all reviews filter count",
    allReviewsResult.data.length,
    3,
  );
  TestValidator.equals(
    "all reviews pagination records",
    allReviewsResult.pagination.records,
    3,
  );
  // 8. Test no match filter (4 stars only when no 4-star reviews exist)
  const noMatchResult =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        rating_min: 4,
        rating_max: 4,
        page: 1,
        limit: 10,
      },
    });
  TestValidator.equals("no match filter count", noMatchResult.data.length, 0);
  TestValidator.equals(
    "no match pagination records",
    noMatchResult.pagination.records,
    0,
  );
  // 9. Verify sorting is newest first
  TestValidator.predicate("reviews sorted newest first", () => {
    if (allReviewsResult.data.length < 2) return true;
    const timestamps = allReviewsResult.data.map((r) =>
      new Date(r.created_at).getTime(),
    );
    return timestamps.every((ts, i) => i === 0 || ts <= timestamps[i - 1]);
  });
}

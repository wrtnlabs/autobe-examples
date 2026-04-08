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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test review listing by product with multiple reviews and pagination validation.
 *
 * Validates the complete review listing workflow including seller product creation, multiple member orders with deliveries, review submissions, and filtered review retrieval. Ensures that reviews are correctly filtered by product_id, sorted by creation date descending, and include proper author information.
 *
 * The test creates two separate member accounts that each purchase the same product, receive delivery, and submit reviews with different ratings. This validates that the review listing endpoint correctly aggregates reviews from multiple customers for the same product.
 *
 * 1. Seller creates product with variant for review testing.
 * 2. First member places order, receives delivery, creates review with rating 5.
 * 3. Second member places order, receives delivery, creates review with rating 3.
 * 4. Lists reviews filtered by product_id and validates response structure.
 * 5. Verifies pagination metadata, review count, sorting order, and author information.
 */
export async function test_api_review_listing_by_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller and product
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "TEST-SKU-001",
          option_values: "Color: Red, Size: Large",
          price: product.base_price,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 2. First member - join, order, shipment, review
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member1);
  const order1 = await generate_random_shopping_mall_member_orders_create(
    member1Connection,
    {},
  );
  typia.assert(order1);
  const orderItem1 = order1.orderItems[0];
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order1.id },
        body: {
          order_item_ids: [orderItem1.id],
          carrier_name: "Test Carrier",
          tracking_number: "TRACK001",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  const review1 = await generate_random_shopping_mall_member_reviews_create(
    member1Connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order1.id,
        shopping_mall_order_item_id: orderItem1.id,
        rating: 5,
        content: "Excellent product! Highly recommended.",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review1);
  // Wait a bit to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Second member - join, order, shipment, review
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member2);
  const order2 = await generate_random_shopping_mall_member_orders_create(
    member2Connection,
    {},
  );
  typia.assert(order2);
  const orderItem2 = order2.orderItems[0];
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order2.id },
        body: {
          order_item_ids: [orderItem2.id],
          carrier_name: "Test Carrier",
          tracking_number: "TRACK002",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment2);
  const review2 = await generate_random_shopping_mall_member_reviews_create(
    member2Connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order2.id,
        shopping_mall_order_item_id: orderItem2.id,
        rating: 3,
        content: "Good product, but could be better.",
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review2);
  // 4. Test review listing by product_id
  const reviewList = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        product_id: product.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(reviewList);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    reviewList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", reviewList.pagination.limit, 10);
  TestValidator.equals("pagination records", reviewList.pagination.records, 2);
  TestValidator.equals("pagination pages", reviewList.pagination.pages, 1);
  // 6. Validate review count
  TestValidator.equals("review count", reviewList.data.length, 2);
  // 7. Validate sorting (newest first - review2 should be first)
  TestValidator.equals(
    "first review is newest",
    reviewList.data[0].id,
    review2.id,
  );
  TestValidator.equals(
    "second review is older",
    reviewList.data[1].id,
    review1.id,
  );
  // 8. Validate review structure and content
  const firstReview = reviewList.data[0];
  TestValidator.equals("first review rating", firstReview.rating, 3);
  TestValidator.equals(
    "first review content",
    firstReview.content,
    "Good product, but could be better.",
  );
  TestValidator.equals(
    "first review author",
    firstReview.author.id,
    member2.id,
  );
  const secondReview = reviewList.data[1];
  TestValidator.equals("second review rating", secondReview.rating, 5);
  TestValidator.equals(
    "second review content",
    secondReview.content,
    "Excellent product! Highly recommended.",
  );
  TestValidator.equals(
    "second review author",
    secondReview.author.id,
    member1.id,
  );
  // 9. Validate author information includes display_name
  TestValidator.predicate(
    "first review author has display name",
    () => firstReview.author.customerProfile !== null,
  );
  TestValidator.predicate(
    "second review author has display name",
    () => secondReview.author.customerProfile !== null,
  );
}

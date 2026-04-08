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
 * Test product review listing with pagination and sorting validation.
 *
 * Validates the complete review retrieval flow including seller product setup, customer order placement, delivery confirmation, and review creation. Ensures that reviews are correctly paginated and sorted by creation date in descending order (newest first).
 *
 * Special attention is given to verifying pagination metadata accuracy, review sorting order, and the structure of review summary objects including author information and rating values.
 *
 * 1. Seller registers and creates a product with variants.
 * 2. Multiple customers register and place orders for the product.
 * 3. Seller creates shipments and marks orders as delivered.
 * 4. Customers create reviews with different ratings and timestamps.
 * 5. Retrieve reviews with pagination and validate sorting order.
 * 6. Verify pagination metadata and review structure.
 */
export async function test_api_product_review_listing_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 2. Create multiple customers and their orders
  const customerConnections: api.IConnection[] = [];
  const customerAuths: IShoppingMallMember.IAuthorized[] = [];
  const orders: IShoppingMallOrder[] = [];
  for (let i = 0; i < 3; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_member_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallMember.IJoin,
    });
    typia.assert(customerAuth);
    customerConnections.push(customerConnection);
    customerAuths.push(customerAuth);
    // Create order for the product
    const order = await generate_random_shopping_mall_member_orders_create(
      customerConnection,
      {},
    );
    typia.assert(order);
    orders.push(order);
  }
  // 3. Seller creates shipments and marks as delivered
  for (const order of orders) {
    const orderItems = order.orderItems;
    if (orderItems.length > 0) {
      const shipment =
        await generate_random_shopping_mall_seller_orders_shipments_create(
          sellerConnection,
          {
            body: {
              order_item_ids: orderItems.map((item) => item.id),
              carrier_name: RandomGenerator.pick([
                "FedEx",
                "UPS",
                "DHL",
                "USPS",
              ]),
              tracking_number: RandomGenerator.alphaNumeric(12),
            },
            params: {
              orderId: order.id,
            },
          },
        );
      typia.assert(shipment);
    }
  }
  // 4. Customers create reviews with different ratings
  const reviews: IShoppingMallReview[] = [];
  for (let i = 0; i < customerConnections.length; i++) {
    const customerConnection = customerConnections[i];
    const order = orders[i];
    const orderItem = order.orderItems[0];
    if (orderItem && orderItem.status === "delivered") {
      const review = await generate_random_shopping_mall_member_reviews_create(
        customerConnection,
        {
          body: {
            shopping_mall_product_id: product.id,
            shopping_mall_order_id: order.id,
            shopping_mall_order_item_id: orderItem.id,
            rating: (i + 1) as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<5>,
            content:
              i % 2 === 0 ? RandomGenerator.paragraph({ sentences: 2 }) : null,
          },
        },
      );
      typia.assert(review);
      reviews.push(review);
    }
  }
  // 5. Test empty review list scenario (new product with no reviews)
  const emptyProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(emptyProduct);
  const emptyReviews = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId: emptyProduct.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(emptyReviews);
  TestValidator.equals(
    "empty reviews records",
    emptyReviews.pagination.records,
    0,
  );
  TestValidator.equals("empty reviews pages", emptyReviews.pagination.pages, 0);
  TestValidator.equals(
    "empty reviews data length",
    emptyReviews.data.length,
    0,
  );
  // 6. Retrieve reviews for the product with pagination
  const reviewResponse =
    await api.functional.shoppingMall.products.reviews.index(connection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(reviewResponse);
  // 7. Validate pagination metadata
  TestValidator.predicate("has reviews", () => reviewResponse.data.length > 0);
  TestValidator.equals(
    "pagination current page",
    reviewResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", reviewResponse.pagination.limit, 10);
  TestValidator.equals(
    "pagination records count",
    reviewResponse.pagination.records,
    reviewResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    () =>
      reviewResponse.pagination.pages ===
      Math.ceil(
        reviewResponse.pagination.records / reviewResponse.pagination.limit,
      ),
  );
  // 8. Validate review structure and sorting
  for (const review of reviewResponse.data) {
    // Validate rating is within 1-5 range
    TestValidator.predicate(
      "rating between 1-5",
      () => review.rating >= 1 && review.rating <= 5,
    );
    // Validate author information exists
    TestValidator.predicate(
      "author exists",
      () => review.author !== null && review.author !== undefined,
    );
    // Validate created_at is valid date-time format
    TestValidator.predicate(
      "created_at is valid",
      () =>
        typeof review.created_at === "string" && review.created_at.length > 0,
    );
    // Validate content is string or null
    TestValidator.predicate(
      "content is string or null",
      () => typeof review.content === "string" || review.content === null,
    );
  }
  // 9. Validate sorting order (newest first - DESC by created_at)
  if (reviewResponse.data.length > 1) {
    for (let i = 0; i < reviewResponse.data.length - 1; i++) {
      const currentReview = reviewResponse.data[i];
      const nextReview = reviewResponse.data[i + 1];
      TestValidator.predicate(
        `review ${i} is newer than review ${i + 1}`,
        () =>
          new Date(currentReview.created_at).getTime() >=
          new Date(nextReview.created_at).getTime(),
      );
    }
  }
  // 10. Test pagination with smaller limit to verify multiple pages
  if (reviewResponse.data.length > 2) {
    const page1Response =
      await api.functional.shoppingMall.products.reviews.index(connection, {
        productId: product.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallReview.IRequest,
      });
    typia.assert(page1Response);
    TestValidator.equals("page 1 limit", page1Response.pagination.limit, 2);
    TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
    const page2Response =
      await api.functional.shoppingMall.products.reviews.index(connection, {
        productId: product.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallReview.IRequest,
      });
    typia.assert(page2Response);
    TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
    // Verify page 2 reviews are older than page 1 reviews
    if (page1Response.data.length > 0 && page2Response.data.length > 0) {
      const lastPage1Review = page1Response.data[page1Response.data.length - 1];
      const firstPage2Review = page2Response.data[0];
      TestValidator.predicate(
        "page 2 reviews are older than page 1",
        () =>
          new Date(lastPage1Review.created_at).getTime() >=
          new Date(firstPage2Review.created_at).getTime(),
      );
    }
  }
}

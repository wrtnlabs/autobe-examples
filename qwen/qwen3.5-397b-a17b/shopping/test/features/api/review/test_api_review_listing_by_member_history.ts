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
 * Test listing reviews by member_id to display a customer's review history on their profile page.
 *
 * Validates the complete review listing workflow including seller product setup, multiple member accounts, order fulfillment, and review creation. Ensures that the PATCH /shoppingMall/reviews endpoint correctly filters reviews by member_id and excludes reviews from other members.
 *
 * Special attention is given to verifying that only the specified member's reviews are returned, reviews are sorted by created_at DESC, and pagination metadata is accurate. The test also validates that a second member's review is properly excluded from the first member's review history.
 *
 * 1. Seller creates two products with variants.
 * 2. Primary member creates orders for both products and receives shipments.
 * 3. Primary member creates two reviews (ratings 4 and 5).
 * 4. Second member creates an order and review for one product.
 * 5. Query reviews filtered by primary member's ID.
 * 6. Verify exactly 2 reviews returned, sorted correctly, with proper pagination.
 */
export async function test_api_review_listing_by_member_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create two products with variants
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
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
  typia.assert(product1);
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product1.id },
        body: {
          sku_code: "SKU-001",
          option_values: "Color: Red, Size: Large",
          price: null,
        },
      },
    );
  typia.assert(variant1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
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
  typia.assert(product2);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product2.id },
        body: {
          sku_code: "SKU-002",
          option_values: "Color: Blue, Size: Medium",
          price: null,
        },
      },
    );
  typia.assert(variant2);
  // 3. Primary member setup
  const primaryMemberConnection: api.IConnection = { host: connection.host };
  const primaryMemberAuth = await authorize_member_join(
    primaryMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(primaryMemberAuth);
  const primaryMemberId = primaryMemberAuth.id;
  // 4. Primary member creates orders for both products
  const order1 = await generate_random_shopping_mall_member_orders_create(
    primaryMemberConnection,
    {},
  );
  typia.assert(order1);
  const order2 = await generate_random_shopping_mall_member_orders_create(
    primaryMemberConnection,
    {},
  );
  typia.assert(order2);
  // 5. Seller creates shipments for both orders
  const orderItem1Id = order1.orderItems[0].id;
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerLoginConnection,
      {
        params: { orderId: order1.id },
        body: {
          order_item_ids: [orderItem1Id],
          carrier_name: "FedEx",
          tracking_number: "TRACK001",
        },
      },
    );
  typia.assert(shipment1);
  const orderItem2Id = order2.orderItems[0].id;
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerLoginConnection,
      {
        params: { orderId: order2.id },
        body: {
          order_item_ids: [orderItem2Id],
          carrier_name: "UPS",
          tracking_number: "TRACK002",
        },
      },
    );
  typia.assert(shipment2);
  // 6. Primary member creates review for first product (rating 4)
  const review1 = await generate_random_shopping_mall_member_reviews_create(
    primaryMemberConnection,
    {
      body: {
        shopping_mall_product_id: product1.id,
        shopping_mall_order_id: order1.id,
        shopping_mall_order_item_id: orderItem1Id,
        rating: 4,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(review1);
  // 7. Primary member creates review for second product (rating 5)
  const review2 = await generate_random_shopping_mall_member_reviews_create(
    primaryMemberConnection,
    {
      body: {
        shopping_mall_product_id: product2.id,
        shopping_mall_order_id: order2.id,
        shopping_mall_order_item_id: orderItem2Id,
        rating: 5,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(review2);
  // 8. Second member setup
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondMemberAuth);
  // 9. Second member creates order for product1
  const order3 = await generate_random_shopping_mall_member_orders_create(
    secondMemberConnection,
    {},
  );
  typia.assert(order3);
  // 10. Seller creates shipment for second member's order
  const orderItem3Id = order3.orderItems[0].id;
  const shipment3 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerLoginConnection,
      {
        params: { orderId: order3.id },
        body: {
          order_item_ids: [orderItem3Id],
          carrier_name: "DHL",
          tracking_number: "TRACK003",
        },
      },
    );
  typia.assert(shipment3);
  // 11. Second member creates review for product1
  const review3 = await generate_random_shopping_mall_member_reviews_create(
    secondMemberConnection,
    {
      body: {
        shopping_mall_product_id: product1.id,
        shopping_mall_order_id: order3.id,
        shopping_mall_order_item_id: orderItem3Id,
        rating: 3,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(review3);
  // Test Execution: Query reviews filtered by primary member's ID
  const response = await api.functional.shoppingMall.reviews.index(connection, {
    body: {
      member_id: primaryMemberId,
      page: 1,
      limit: 10,
    } satisfies IShoppingMallReview.IRequest,
  });
  typia.assert(response);
  // Validate response contains exactly 2 reviews
  TestValidator.equals("review count", response.data.length, 2);
  // Validate pagination metadata
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals("pagination records", response.pagination.records, 2);
  TestValidator.equals("pagination pages", response.pagination.pages, 1);
  // Validate reviews are sorted by created_at DESC (newest first)
  TestValidator.predicate(
    "reviews sorted DESC",
    () =>
      new Date(response.data[0].created_at).getTime() >=
      new Date(response.data[1].created_at).getTime(),
  );
  // Validate only primary member's reviews are returned (not second member's)
  TestValidator.predicate("all reviews from primary member", () =>
    response.data.every((review) => review.author.id === primaryMemberId),
  );
  // Validate each review includes complete author information
  TestValidator.predicate("author information present", () =>
    response.data.every(
      (review) =>
        review.author.id !== undefined &&
        review.author.email !== undefined &&
        review.author.status !== undefined,
    ),
  );
  // Validate review ratings match what was created
  const ratings = response.data.map((r) => r.rating).sort((a, b) => a - b);
  TestValidator.equals("ratings match", ratings, [4, 5]);
}

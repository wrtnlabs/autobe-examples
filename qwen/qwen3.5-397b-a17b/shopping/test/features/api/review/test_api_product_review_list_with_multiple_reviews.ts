import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test product review listing with multiple reviews from different customers.
 *
 * This test validates the review listing endpoint by:
 * 1. Setting up a seller with a product
 * 2. Creating two customers who purchase and receive the product
 * 3. Having both customers create reviews for the product
 * 4. Retrieving the review list and validating pagination and content
 */
export async function test_api_product_review_list_with_multiple_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account and product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
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
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 2. Setup first customer and create order
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer1Auth);
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customer1Connection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order1);
  // 3. Seller creates shipment for first order
  const orderItem1 = order1.orderItems[0];
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: RandomGenerator.name(2),
        tracking_number: RandomGenerator.alphaNumeric(12),
        order_item_ids: [orderItem1.id],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment1);
  // 4. First customer confirms delivery
  const confirmedShipment1 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customer1Connection,
      {
        shipmentId: shipment1.id,
      },
    );
  typia.assert(confirmedShipment1);
  // 5. First customer creates review
  const review1 = await generate_random_shopping_mall_customer_reviews_create(
    customer1Connection,
    {
      body: {
        product_id: product.id,
        order_id: order1.id,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review1);
  // 6. Setup second customer and create order
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer2Auth);
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customer2Connection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order2);
  // 7. Seller creates shipment for second order
  const orderItem2 = order2.orderItems[0];
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_carrier: RandomGenerator.name(2),
        tracking_number: RandomGenerator.alphaNumeric(12),
        order_item_ids: [orderItem2.id],
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment2);
  // 8. Second customer confirms delivery
  const confirmedShipment2 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customer2Connection,
      {
        shipmentId: shipment2.id,
      },
    );
  typia.assert(confirmedShipment2);
  // 9. Second customer creates review (rating only, no content)
  const review2 = await generate_random_shopping_mall_customer_reviews_create(
    customer2Connection,
    {
      body: {
        product_id: product.id,
        order_id: order2.id,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: null,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review2);
  // 10. Retrieve product reviews list
  const reviewsResponse =
    await api.functional.shoppingMall.customer.products.reviews.index(
      customer1Connection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(reviewsResponse);
  // 11. Validate pagination metadata
  TestValidator.equals("current page", reviewsResponse.pagination.current, 1);
  TestValidator.equals("limit", reviewsResponse.pagination.limit, 10);
  TestValidator.equals("total records", reviewsResponse.pagination.records, 2);
  TestValidator.equals("total pages", reviewsResponse.pagination.pages, 1);
  // 12. Validate both reviews are returned
  TestValidator.equals("review count", reviewsResponse.data.length, 2);
  // 13. Validate reviews are sorted by newest first (by created_at)
  if (reviewsResponse.data.length >= 2) {
    const firstReviewTime = new Date(
      reviewsResponse.data[0].created_at,
    ).getTime();
    const secondReviewTime = new Date(
      reviewsResponse.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "reviews sorted newest first",
      firstReviewTime >= secondReviewTime,
    );
  }
  // 14. Validate both customers' reviews are present
  const customerIds = reviewsResponse.data.map((r) => r.customer.id);
  TestValidator.predicate(
    "both customers reviewed",
    customerIds.includes(customer1Auth.id) &&
      customerIds.includes(customer2Auth.id),
  );
  // 15. Validate review content can be null (rating-only review)
  const ratingOnlyReview = reviewsResponse.data.find(
    (r) => r.content === null || r.content === undefined,
  );
  TestValidator.predicate(
    "rating-only review exists",
    ratingOnlyReview !== undefined,
  );
}

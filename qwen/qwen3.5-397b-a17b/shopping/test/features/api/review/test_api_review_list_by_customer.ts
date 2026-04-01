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

export async function test_api_review_list_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller and products
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
  // Create two products for the customer to review
  const product1 =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product1);
  const product2 =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product2);
  // 2. Setup: Create customer and place orders
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // Create order containing products (handled by generate function)
  const order =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 3. Seller ships the order items
  const orderItemIds = order.orderItems.map((item) => item.id);
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 4. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 5. Customer writes multiple reviews for different products from the order
  const review1 = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        product_id: product1.id,
        order_id: order.id,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review1);
  const review2 = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        product_id: product2.id,
        order_id: order.id,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review2);
  // 6. Test: Retrieve reviews filtered by customer ID
  const reviewsByCustomer = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        customer_id: customerId,
        page: 1,
        limit: 20,
        sort: "created_at DESC",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(reviewsByCustomer);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination",
    reviewsByCustomer.pagination !== null,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(reviewsByCustomer.data),
  );
  TestValidator.predicate(
    "has at least 2 reviews",
    reviewsByCustomer.data.length >= 2,
  );
  // Validate that both reviews are in the results
  const reviewIds = reviewsByCustomer.data.map((r) => r.id);
  TestValidator.predicate("contains review1", reviewIds.includes(review1.id));
  TestValidator.predicate("contains review2", reviewIds.includes(review2.id));
  // 7. Validate review content structure for each review
  for (const review of reviewsByCustomer.data) {
    // Verify customer_id matches the filter
    TestValidator.equals(
      "customer ID matches filter",
      review.customer.id,
      customerId,
    );
    // Verify rating is in valid range
    TestValidator.predicate(
      "has valid rating",
      review.rating >= 1 && review.rating <= 5,
    );
    // Verify timestamps exist
    TestValidator.predicate("has created_at", review.created_at !== null);
    TestValidator.predicate("has updated_at", review.updated_at !== null);
    // Verify customer info exists
    TestValidator.predicate("has customer info", review.customer !== null);
  }
  // 8. Test pagination with customer_id filter
  const paginatedReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        customer_id: customerId,
        page: 1,
        limit: 1,
        sort: "created_at DESC",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(paginatedReviews);
  TestValidator.equals("page limit respected", paginatedReviews.data.length, 1);
  TestValidator.equals(
    "pagination current page",
    paginatedReviews.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedReviews.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records >= 2",
    paginatedReviews.pagination.records >= 2,
  );
  // 9. Test authorization boundary: Create another customer
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomerAuth = await authorize_customer_join(
    otherCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(otherCustomerAuth);
  // Other customer tries to filter by first customer's ID - should return empty
  const otherCustomerReviews = await api.functional.shoppingMall.reviews.index(
    otherCustomerConnection,
    {
      body: {
        customer_id: customerId,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(otherCustomerReviews);
  // Other customer should not see the first customer's reviews (authorization boundary)
  TestValidator.predicate(
    "other customer cannot see first customer's reviews",
    otherCustomerReviews.data.length === 0 ||
      !otherCustomerReviews.data.some((r) => r.customer.id === customerId),
  );
}
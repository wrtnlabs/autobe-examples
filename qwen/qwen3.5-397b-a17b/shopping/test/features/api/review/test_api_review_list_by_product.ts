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

export async function test_api_review_list_by_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller account and product
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
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } as Partial<IShoppingMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 2. Create multiple customers and have them purchase the product
  const customerConnections: api.IConnection[] = [];
  const customerAuths: IShoppingMallCustomer.IAuthorized[] = [];
  const orders: IShoppingMallOrder[] = [];
  const shipments: IShoppingMallShipment[] = [];
  const orderItems: IShoppingMallOrderItem[] = [];
  // Create 3 customers with reviews
  for (let i = 0; i < 3; i++) {
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
    customerConnections.push(customerConnection);
    customerAuths.push(customerAuth);
    // Create order for this customer
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {} as Partial<IShoppingMallOrder.ICreate>,
      },
    );
    typia.assert(order);
    orders.push(order);
    // Get the first order item (the order is created for our product)
    const orderItem = order.orderItems[0];
    if (!orderItem) {
      throw new Error("Order item not found");
    }
    orderItems.push(orderItem);
    // Seller creates shipment
    const shipment =
      await generate_random_shopping_mall_seller_shipments_create(
        sellerConnection,
        {
          body: {
            order_item_ids: [orderItem.id],
          } as Partial<IShoppingMallShipment.ICreate>,
        },
      );
    typia.assert(shipment);
    shipments.push(shipment);
    // Customer confirms delivery
    const confirmedShipment =
      await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
        customerConnection,
        {
          shipmentId: shipment.id,
        },
      );
    typia.assert(confirmedShipment);
  }
  // 3. Create reviews with different ratings and content
  const reviews: IShoppingMallReview[] = [];
  const reviewData = [
    { rating: 5, content: RandomGenerator.paragraph({ sentences: 3 }) },
    { rating: 3, content: null }, // Rating only
    { rating: 1, content: RandomGenerator.paragraph({ sentences: 2 }) },
  ];
  for (let i = 0; i < 3; i++) {
    const review = await generate_random_shopping_mall_customer_reviews_create(
      customerConnections[i],
      {
        body: {
          product_id: product.id,
          order_id: orders[i].id,
          rating: reviewData[i].rating as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          content: reviewData[i].content,
        } as Partial<IShoppingMallReview.ICreate>,
      },
    );
    typia.assert(review);
    reviews.push(review);
  }
  // 4. Test review list endpoint with product_id filter
  const reviewListResponse = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        product_id: product.id,
        page: 1,
        limit: 10,
        sort: "created_at DESC",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(reviewListResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "current page",
    reviewListResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit", reviewListResponse.pagination.limit, 10);
  TestValidator.equals(
    "total records",
    reviewListResponse.pagination.records,
    3,
  );
  TestValidator.equals("total pages", reviewListResponse.pagination.pages, 1);
  // 6. Validate reviews are returned
  TestValidator.equals("reviews count", reviewListResponse.data.length, 3);
  // 7. Validate each review structure
  for (const review of reviewListResponse.data) {
    typia.assert(review);
    // Verify rating is within valid range
    TestValidator.predicate(
      "rating in range",
      review.rating >= 1 && review.rating <= 5,
    );
    // Verify customer information exists
    TestValidator.predicate(
      "customer exists",
      review.customer !== null && review.customer !== undefined,
    );
    // Verify timestamps exist
    TestValidator.predicate(
      "created_at exists",
      review.created_at !== null && review.created_at !== undefined,
    );
    TestValidator.predicate(
      "updated_at exists",
      review.updated_at !== null && review.updated_at !== undefined,
    );
  }
  // 8. Validate sorting (newest first)
  if (reviewListResponse.data.length >= 2) {
    const firstReview = reviewListResponse.data[0];
    const lastReview =
      reviewListResponse.data[reviewListResponse.data.length - 1];
    TestValidator.predicate(
      "sorted by newest first",
      new Date(firstReview.created_at).getTime() >=
        new Date(lastReview.created_at).getTime(),
    );
  }
  // 9. Test pagination with different page size
  const paginatedResponse = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        product_id: product.id,
        page: 1,
        limit: 2,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated limit",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "paginated records",
    paginatedResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "paginated pages",
    paginatedResponse.pagination.pages,
    2,
  );
  TestValidator.equals(
    "paginated data length",
    paginatedResponse.data.length,
    2,
  );
  // 10. Test second page
  const secondPageResponse = await api.functional.shoppingMall.reviews.index(
    connection,
    {
      body: {
        product_id: product.id,
        page: 2,
        limit: 2,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page current",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page data length",
    secondPageResponse.data.length,
    1,
  );
}

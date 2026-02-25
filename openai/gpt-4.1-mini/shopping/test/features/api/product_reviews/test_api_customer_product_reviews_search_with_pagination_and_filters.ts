import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";

export async function test_api_customer_product_reviews_search_with_pagination_and_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Search all active (non-deleted) product reviews with pagination and validate data consistency
  {
    // 1. Register and authorize a new customer
    const customerConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_customer_join(customerConnection, {
      body: {},
    });
    typia.assert(authorized);
    customerConnection.headers ??= {};
    customerConnection.headers.Authorization = authorized.token.access;
    // 2. Create an order with at least one order item
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {},
      },
    );
    typia.assert(order);
    // 3. From order items, choose one to filter reviews by order item id and to create valid product review filter queries
    const orderItem = order.orderItems[0];
    typia.assert(orderItem);
    // 4. Search product reviews without any filter to get all active reviews
    const body1: IShoppingMallProductReview.IRequest = {
      page: 1,
      limit: 10,
      includeDeleted: false,
    };
    const result1 =
      await api.functional.shoppingMall.customer.productReviews.index(
        customerConnection,
        { body: body1 },
      );
    typia.assert(result1);
    // 5. Validate pagination fields
    const pagination1 = result1.pagination;
    TestValidator.predicate(
      "pagination current page valid",
      pagination1.current >= 1,
    );
    TestValidator.predicate("pagination limit valid", pagination1.limit >= 1);
    TestValidator.predicate(
      "pagination records non-negative",
      pagination1.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      pagination1.pages >= 0,
    );
    // 6. Validate reviews in results: no deleted reviews, rating between 1 and 5, required relations exist
    for (const review of result1.data) {
      typia.assert(review);
      TestValidator.predicate(
        "review not soft deleted",
        review.deletedAt === null || review.deletedAt === undefined,
      );
      TestValidator.predicate(
        "rating between 1 and 5",
        review.rating >= 1 && review.rating <= 5,
      );
      TestValidator.equals(
        "review has customer id",
        typeof review.customer.id,
        "string",
      );
      TestValidator.equals(
        "review has order item id",
        typeof review.orderItem.id,
        "string",
      );
      TestValidator.equals(
        "review has product variant id",
        typeof review.productVariant.id,
        "string",
      );
    }
  }
  // Scenario 2: Filter product reviews by product variant ID, rating range, and text search
  {
    // Reuse customer connection with authorized user
    const customerConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_customer_join(customerConnection, {
      body: {},
    });
    typia.assert(authorized);
    customerConnection.headers ??= {};
    customerConnection.headers.Authorization = authorized.token.access;
    // Create an order with an order item
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {},
      },
    );
    typia.assert(order);
    const orderItem = order.orderItems[0];
    typia.assert(orderItem);
    // Compose a search keyword from a random sample substring of a content field
    const searchKeyword = orderItem.productVariant.skuCode.substring(0, 3);
    // Use productVariantId filter, rating range, and a search keyword
    const body2: IShoppingMallProductReview.IRequest = {
      shoppingMallProductVariantId: orderItem.productVariant.id,
      ratingMin: 2,
      ratingMax: 5,
      search: searchKeyword,
      page: 1,
      limit: 5,
      includeDeleted: false,
    };
    const result2 =
      await api.functional.shoppingMall.customer.productReviews.index(
        customerConnection,
        { body: body2 },
      );
    typia.assert(result2);
    // Validate pagination fields
    const pagination2 = result2.pagination;
    TestValidator.predicate(
      "pagination current page valid",
      pagination2.current >= 1,
    );
    TestValidator.predicate("pagination limit valid", pagination2.limit >= 1);
    TestValidator.predicate(
      "pagination records non-negative",
      pagination2.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      pagination2.pages >= 0,
    );
    // Validate reviews
    for (const review of result2.data) {
      typia.assert(review);
      TestValidator.predicate(
        "review rating in range",
        review.rating >= 2 && review.rating <= 5,
      );
      TestValidator.predicate(
        "review body contains keyword",
        review.body !== undefined && review.body !== null && review.body.includes(searchKeyword),
      );
      TestValidator.predicate(
        "review not soft deleted",
        review.deletedAt === null || review.deletedAt === undefined,
      );
      TestValidator.equals(
        "review product variant id matches filter",
        review.productVariant.id,
        orderItem.productVariant.id,
      );
    }
  }
  // Scenario 3: Search product reviews by customer id and order item id with empty result set edge case
  {
    // New customer connection
    const customerConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_customer_join(customerConnection, {
      body: {},
    });
    typia.assert(authorized);
    customerConnection.headers ??= {};
    customerConnection.headers.Authorization = authorized.token.access;
    // Create an order and pick an existing order item
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {},
      },
    );
    typia.assert(order);
    const orderItem = order.orderItems[0];
    typia.assert(orderItem);
    // Use customer id with order item id filter which is unlikely to have data (empty result set)
    const body3: IShoppingMallProductReview.IRequest = {
      shoppingMallCustomerId: authorized.id,
      shoppingMallOrderItemId: orderItem.id,
      page: 1,
      limit: 5,
      includeDeleted: false,
    };
    const result3 =
      await api.functional.shoppingMall.customer.productReviews.index(
        customerConnection,
        { body: body3 },
      );
    typia.assert(result3);
    // Validate that result data is empty
    TestValidator.equals("empty result data length", result3.data.length, 0);
    // Validate pagination metadata
    const pagination3 = result3.pagination;
    TestValidator.predicate(
      "pagination current page valid",
      pagination3.current >= 1,
    );
    TestValidator.predicate("pagination limit valid", pagination3.limit >= 1);
    TestValidator.predicate(
      "pagination records non-negative",
      pagination3.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      pagination3.pages >= 0,
    );
  }
}

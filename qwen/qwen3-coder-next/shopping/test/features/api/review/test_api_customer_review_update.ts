import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_orders_items_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_reviews_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test the update customer review functionality.
 * This scenario tests creating a review and then updating it with new data.
 * The test validates the review update workflow in a shopping mall context.
 */
export async function test_api_customer_review_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(authorized);
  // 2. Create a new order for the customer
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: typia.random<IShoppingMallOrder.ICreate>(),
    },
  );
  typia.assert(order);
  // 3. Create an initial review for the order
  // Use type assertion to access the 'id' property which exists in the actual API response
  const orderId = (order as IShoppingMallOrder & IEntity).id;
  const initialReview =
    await generate_random_shopping_mall_customer_orders_items_reviews_create(
      customerConnection,
      {
        params: {
          orderId: orderId,
          itemId: RandomGenerator.alphaNumeric(8),
        },
      },
    );
  typia.assert(initialReview);
  // 4. Update the review with new content
  const reviewId = (initialReview as IShoppingMallReview & IEntity).id;
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: reviewId,
        body: typia.random<IShoppingMallReview.IUpdate>(),
      },
    );
  typia.assert(updatedReview);
  // 5. Validate the update - basic check that review was updated
  TestValidator.notEquals(
    "review was updated",
    reviewId,
    (updatedReview as IShoppingMallReview & IEntity).id,
  );
}

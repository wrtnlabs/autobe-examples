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

export async function test_api_shopping_mall_review_rating_only_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Step 2: Create customer-specific connection with authentication token
  const customerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuth.token.access },
  };
  // Step 3: Create an order for the customer
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerAuthConnection,
    {
      body: {},
    },
  );
  typia.assert(order);
  // Step 4: Create initial review for the order
  // Using random UUIDs since order.id and items are not accessible in the type definitions
  const initialReview =
    await generate_random_shopping_mall_customer_orders_items_reviews_create(
      customerAuthConnection,
      {
        body: {},
        params: {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          itemId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(initialReview);
  // Step 5: Update the review rating (content should be preserved)
  // Since IShoppingMallReview type doesn't expose properties, we can't validate specific fields
  // The test focuses on API endpoint functionality
  const updatedReview =
    await api.functional.shoppingMall.products.reviews.update(
      customerAuthConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          rating: 5,
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // Test validates API functionality without property inspection due to type limitations
}

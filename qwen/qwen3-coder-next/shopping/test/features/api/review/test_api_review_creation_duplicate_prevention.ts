import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
 * Test duplicate review prevention for shopping mall orders.
 * Verifies that a customer cannot submit multiple reviews for the same order item.
 */
export async function test_api_review_creation_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login first customer
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await api.functional.shoppingMall.auth.customer.join(
    customer1Connection,
    {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    },
  );
  typia.assert(customer1);
  // 2. Create second customer for comparison
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await api.functional.shoppingMall.auth.customer.join(
    customer2Connection,
    {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    },
  );
  typia.assert(customer2);
  // 3. First customer creates an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customer1Connection,
    {},
  );
  typia.assert(order);
  // 4. Get order items from the order response (simulated through typia.random)
  // Since the DTO is empty, we'll use the order's ID pattern and create mock item IDs
  const orderId = RandomGenerator.alphaNumeric(8);
  const itemId = RandomGenerator.alphaNumeric(8);
  // 5. First customer successfully creates their first review
  const firstReview =
    await generate_random_shopping_mall_customer_orders_items_reviews_create(
      customer1Connection,
      {
        body: {
          rating: 4,
          content: "Great product!",
        } satisfies IShoppingMallReview.ICreate,
        params: {
          orderId,
          itemId,
        },
      },
    );
  typia.assert(firstReview);
  // 6. First customer attempts to create a duplicate review (should fail)
  await TestValidator.error("duplicate review prevention", async () => {
    await generate_random_shopping_mall_customer_orders_items_reviews_create(
      customer1Connection,
      {
        body: {
          rating: 5,
          content: "Second review attempt",
        } satisfies IShoppingMallReview.ICreate,
        params: {
          orderId,
          itemId,
        },
      },
    );
  });
  // 7. Second customer can still review the same order item (different customer)
  const secondReview =
    await generate_random_shopping_mall_customer_orders_items_reviews_create(
      customer2Connection,
      {
        body: {
          rating: 3,
          content: "Second customer's review",
        } satisfies IShoppingMallReview.ICreate,
        params: {
          orderId,
          itemId,
        },
      },
    );
  typia.assert(secondReview);
}

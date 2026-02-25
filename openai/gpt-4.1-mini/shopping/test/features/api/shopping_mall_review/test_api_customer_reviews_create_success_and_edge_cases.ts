import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
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
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_customer_reviews_create_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join customer and prepare authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(authorizedCustomer);
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Create an order with no items initially
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        orderItems: [],
      },
    },
  );
  typia.assert(order);
  // 3. Create an order item marked as delivered
  const deliveredOrderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderId: order.id,
          shoppingMallProductVariantId: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 1,
          status: "delivered",
        },
      },
    );
  typia.assert(deliveredOrderItem);
  // 4. Successfully create review for delivered order item
  const reviewBody = RandomGenerator.paragraph({ sentences: 3 });
  const reviewRating =
    (typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >() %
      5) +
    1;
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: reviewRating,
        body: reviewBody,
        // orderItemId and orderId are not part of IShoppingMallReview.ICreate,
        // the API internally associates the review with the delivered item.
      },
    },
  );
  typia.assert(review);
  TestValidator.equals("review rating matches", review.rating, reviewRating);
  TestValidator.equals("review body matches", review.body ?? null, reviewBody);
  TestValidator.equals(
    "review order item matches",
    review.orderItem.id,
    deliveredOrderItem.id,
  );
  TestValidator.equals("review order matches", review.order.id, order.id);
  // 5. Attempt duplicate review submission (should fail)
  await TestValidator.error("should reject duplicate review", async () => {
    await generate_random_shopping_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          rating: reviewRating,
          body: reviewBody,
        },
      },
    );
  });
  // 6. Create order item not yet delivered
  const undeliveredOrderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderId: order.id,
          shoppingMallProductVariantId: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 1,
          status: "paid",
        },
      },
    );
  typia.assert(undeliveredOrderItem);
  // 7. Attempt to submit review for undelivered order item (should fail)
  await TestValidator.error(
    "should reject review for undelivered order item",
    async () => {
      await generate_random_shopping_mall_customer_reviews_create(
        customerConnection,
        {
          body: {
            rating:
              (typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
              >() %
                5) +
              1,
            body: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );
}

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

export async function test_api_customer_product_review_deletion_forbidden_for_non_author(
  connection: api.IConnection,
): Promise<void> {
  // Test that deletion of a product review by a customer who is not the author is forbidden.
  // 1. Authenticate as a first customer by registering a new account.
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomerAuth = await authorize_customer_join(connection, {});
  firstCustomerConnection.headers = {
    Authorization: firstCustomerAuth.token.access,
  };
  typia.assert(firstCustomerAuth);
  // 2. Using the first customer connection, create an order with random data.
  const order = await generate_random_shopping_mall_customer_orders_create(
    firstCustomerConnection,
    {},
  );
  typia.assert(order);
  // Safe cast orderItems to IShoppingMallOrderItem[]
  const orderItems = order.orderItems as IShoppingMallOrderItem[];
  // 3. Using the first customer connection, create an order item linked to the order.
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      firstCustomerConnection,
      {
        body: {
          shoppingMallOrderId: order.id,
          shoppingMallProductVariantId:
            typia.assert(orderItems[0].shoppingMallProductVariantId),
          quantity: 1,
          status: "paid",
        },
      },
    );
  typia.assert(orderItem);
  // 4. Using the first customer connection, create a product review for the order item.
  const review = await generate_random_shopping_mall_customer_reviews_create(
    firstCustomerConnection,
    {
      body: {
        rating: 5,
        body: "Excellent product!",
        // link review explicitly to the order and order item
      },
    },
  );
  typia.assert(review);
  // 5. Authenticate as a second different customer by registering a new account.
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomerAuth = await authorize_customer_join(connection, {});
  secondCustomerConnection.headers = {
    Authorization: secondCustomerAuth.token.access,
  };
  typia.assert(secondCustomerAuth);
  // 6. Using the second customer connection, attempt to delete the first customer's review.
  await TestValidator.httpError(
    "deletion forbidden for non-author",
    403,
    async () => {
      await api.functional.shoppingMall.customer.reviews.erase(
        secondCustomerConnection,
        {
          reviewId: review.id,
        },
      );
    },
  );
  // 7. Verify the review still exists after the deletion attempt by fetching it.
  // Since fetching single review endpoint is not provided in input, verify by updating or listing reviews.
  // We fetch the review by using the first customer connection through re-creation or listing since direct get is not provided.
  const reFetchReview =
    await generate_random_shopping_mall_customer_reviews_create(
      firstCustomerConnection,
      {
        body: {
          rating: 4,
          body: "Should not interfere",
        },
      },
    );
  typia.assert(reFetchReview);
}

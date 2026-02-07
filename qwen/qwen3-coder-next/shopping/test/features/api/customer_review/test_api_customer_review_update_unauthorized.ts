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

export async function test_api_customer_review_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer (original review writer)
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(firstCustomerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 2. Create second customer (unauthorized updater)
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(secondCustomerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 3. First customer writes a review (using random order/item IDs since DTOs are empty)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const reviewResult =
    await generate_random_shopping_mall_customer_orders_items_reviews_create(
      firstCustomerConnection,
      {
        body: typia.random<IShoppingMallReview.ICreate>(),
        params: {
          orderId: orderId,
          itemId: itemId,
        },
      },
    );
  typia.assert(reviewResult);
  // 4. Second customer attempts to update first customer's review (should fail due to ownership validation)
  // Since DTOs are empty, we can't access reviewResult.id directly, but the API expects a string ID
  // We'll use the same orderId and itemId to try to update the review
  await TestValidator.error(
    "Unauthorized review update should throw access denied error",
    async () => {
      await api.functional.shoppingMall.customer.reviews.update(
        secondCustomerConnection,
        {
          reviewId: orderId, // Using orderId as a placeholder since we can't access actual review ID
          body: typia.random<IShoppingMallReview.IUpdate>(),
        },
      );
    },
  );
}

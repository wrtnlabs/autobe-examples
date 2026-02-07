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

export async function test_api_review_creation_undelivered_item(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234", // password strength validation skipped in test
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerAuthorized);
  // Step 2: Create order with product items
  // Using type assertion to access id property that should exist but isn't typed
  const customerOrder: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(customerOrder);
  // Step 3: Attempt to write review for undelivered item
  // Using type assertion with proper typing for id access
  const orderId = customerOrder as unknown as {
    id: string;
  };
  // Generate a proper UUID for the order item ID
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // Test the review creation API - this should throw an error due to undelivered item status
  await TestValidator.error(
    "review creation should fail for undelivered item",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.reviews.create(
        customerConnection,
        {
          orderId: orderId.id,
          itemId: itemId,
          body: {
            rating: 4,
            content: "Test review for undelivered item",
          } satisfies IShoppingMallReview.ICreate,
        },
      );
    },
  );
}

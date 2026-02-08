import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_product_reviews_create } from "../../../generate/generate_random_shopping_mall_product_reviews_create";
import { prepare_random_shopping_mall_product_review } from "../../../prepare/prepare_random_shopping_mall_product_review";

export async function test_api_product_review_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and obtains authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare a new review request body (empty or customized as needed)
  const reviewCreateBody = {};
  // 3. Generate a random valid product review for this customer
  const firstReview = await generate_random_shopping_mall_product_reviews_create(
    customerConnection,
    {
      body: reviewCreateBody,
    },
  );
  typia.assert(firstReview);
  // 4. Attempt to create a duplicate review using the same request body which should trigger the duplicate prevention error
  await TestValidator.error("reject duplicate product review", async () => {
    await generate_random_shopping_mall_product_reviews_create(
      customerConnection,
      {
        body: reviewCreateBody,
      },
    );
  });
}

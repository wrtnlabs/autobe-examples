import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_sale_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_sale_reviews_create";
import { prepare_random_shopping_mall_sale_review } from "../../../prepare/prepare_random_shopping_mall_sale_review";

export async function test_api_sale_review_create_successful(
  connection: api.IConnection,
): Promise<void> {
  // Test the creation of a new sale review by a newly registered and authenticated customer.
  // The customer provides a valid sale ID, a rating of 5 stars, and a non-empty review text.
  // Verify that the response conforms to IShoppingMallSaleReview type.
  // 1. Authenticate new customer by joining
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Store token in headers
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create sale review with valid data
  const reviewBody: Partial<IShoppingMallSaleReview.ICreate> = {
    sale_id: typia.random<string & tags.Format<"uuid">>(),
    rating: 5 as 5,
    body: "Excellent product! Highly recommended.",
  };
  const createdReview =
    await generate_random_shopping_mall_customer_sale_reviews_create(
      customerConnection,
      { body: reviewBody },
    );
  // 3. Assert that the response conforms to the expected review type
  typia.assert(createdReview);
}

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

export async function test_api_sale_review_create_minimum_rating_no_body(
  connection: api.IConnection,
): Promise<void> {
  // Scenario rewritten due to missing ICreate properties in DTO: only empty objects possible
  // 1. Customer registration and authentication with empty join body
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(connection, {
    body: {},
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create sale review with empty create body (minimum possible)
  const review =
    await generate_random_shopping_mall_customer_sale_reviews_create(
      userConnection,
      {
        body: {},
      },
    );
  // 3. Validate the created review
  typia.assert(review);
}

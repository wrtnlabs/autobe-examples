import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_sales_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_sales_reviews_create";
import { prepare_random_shopping_mall_sale_review } from "../../../prepare/prepare_random_shopping_mall_sale_review";

export async function test_api_customer_review_update_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. First customer joins (sign up) and gets authorized connection
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: { password: "securepassword123" },
  });
  typia.assert(firstCustomer);
  // 2. Create a review for a sale by first customer
  // We'll create a review with random saleId and link to the first customer
  const review =
    await generate_random_shopping_mall_customer_sales_reviews_create(
      firstCustomerConnection,
      {
        params: { saleId: typia.random<string & tags.Format<"uuid">>() },
        body: {
          shoppingMallCustomerId: firstCustomer.id,
          rating: 5,
          body: "Great product!",
        },
      },
    );
  typia.assert(review);
  // 3. Second customer joins (different user) and gets authorized connection
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: { password: "anothersecurepassword" },
    },
  );
  typia.assert(secondCustomer);
  // 4. Second customer attempts to update the review created by the first customer
  await TestValidator.error(
    "unauthorized review update should fail",
    async () => {
      await api.functional.shoppingMall.customer.sales.reviews.updateReview(
        secondCustomerConnection,
        {
          saleId: review.shoppingMallSaleId,
          reviewId: review.id,
          body: {
            rating: 1,
            body: "Unauthorized update attempt",
          },
        },
      );
    },
  );
}

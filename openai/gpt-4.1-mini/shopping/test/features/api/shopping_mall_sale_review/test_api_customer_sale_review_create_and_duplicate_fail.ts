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

export async function test_api_customer_sale_review_create_and_duplicate_fail(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass1234",
    },
  });
  typia.assert(customer);
  // Create a fake saleId for testing - since sale creation is not available, we simulate with a random UUID
  const saleId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: Successful review creation
  const reviewBody1: IShoppingMallSaleReview.ICreate = {
    shoppingMallSaleId: saleId,
    shoppingMallCustomerId: customer.id,
    rating: 5,
    body: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const review1 =
    await generate_random_shopping_mall_customer_sales_reviews_create(
      customerConnection,
      {
        body: reviewBody1,
        params: { saleId },
      },
    );
  typia.assert(review1);
  // Validate the response's main fields
  TestValidator.equals(
    "review matches saleId",
    review1.shoppingMallSaleId,
    saleId,
  );
  TestValidator.equals(
    "review matches customerId",
    review1.shoppingMallCustomerId,
    customer.id,
  );
  TestValidator.equals("review rating is correct", review1.rating, 5);
  // Scenario 2: Attempt to create duplicate review for same sale by same customer
  const reviewBody2: IShoppingMallSaleReview.ICreate = {
    shoppingMallSaleId: saleId,
    shoppingMallCustomerId: customer.id,
    rating: 4,
    body: RandomGenerator.paragraph({ sentences: 1 }),
  };
  await TestValidator.error(
    "duplicate review for same sale by same customer",
    async () => {
      await generate_random_shopping_mall_customer_sales_reviews_create(
        customerConnection,
        {
          body: reviewBody2,
          params: { saleId },
        },
      );
    },
  );
}

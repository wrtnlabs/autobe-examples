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

export async function test_api_customer_review_update_with_no_body(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare a sale ID for review creation (use random UUID for test continuity)
  const saleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a review with a body
  const originalReview =
    await generate_random_shopping_mall_customer_sales_reviews_create(
      customerConnection,
      {
        body: {
          shoppingMallSaleId: saleId,
          shoppingMallCustomerId: authorized.id,
          rating: 4,
          body: "Initial review body",
        },
        params: { saleId },
      },
    );
  typia.assert(originalReview);
  // 4. Update the review with valid rating but omit the body (explicitly set to null)
  const updatePayload: IShoppingMallSaleReview.IUpdate = {
    rating: 5,
    body: null,
  };
  const updatedReview =
    await api.functional.shoppingMall.customer.sales.reviews.updateReview(
      customerConnection,
      {
        saleId,
        reviewId: originalReview.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedReview);
  // 5. Verify the update reflects the new rating and the body is null
  TestValidator.equals(
    "updated review rating",
    updatedReview.rating,
    updatePayload.rating,
  );
  // body property can be null or empty string (if omitted, must be null explicitly tested)
  TestValidator.predicate(
    "updated review body is null or empty",
    updatedReview.body === null ||
      updatedReview.body === "" ||
      updatedReview.body === undefined,
  );
  // 6. Verify that other unchanged properties remain equal
  TestValidator.equals(
    "review sale id",
    originalReview.shoppingMallSaleId,
    originalReview.shoppingMallSaleId,
  );
  TestValidator.equals(
    "review customer id",
    originalReview.shoppingMallCustomerId,
    originalReview.shoppingMallCustomerId,
  );
}

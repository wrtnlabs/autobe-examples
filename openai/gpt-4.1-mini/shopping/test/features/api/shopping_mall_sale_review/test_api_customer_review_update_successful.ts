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

export async function test_api_customer_review_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration (join)
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongpassword123",
    },
  });
  typia.assert(authorizedCustomer);
  // Update customerConnection headers with authorized token
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // Use the id of the authorized customer for review creation
  const customerId = authorizedCustomer.id;
  // 2. Create a saleId to associate the review with
  // Since the test scenario requires an existing sale, but no sale creation API provided,
  // we'll generate a random saleId assuming it exists in the system for testing purposes
  // To keep it realistic, generate random UUID style string
  const saleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create an initial review for the sale using the utility function
  const initialReview =
    await generate_random_shopping_mall_customer_sales_reviews_create(
      customerConnection,
      {
        params: { saleId },
        // Override properties to set the right customerId and saleId
        body: {
          shoppingMallCustomerId: customerId,
          shoppingMallSaleId: saleId,
          rating: 3,
          body: "Initial review text.",
        },
      },
    );
  typia.assert(initialReview);
  // 4. Prepare updated review data with valid rating and new review text
  const updatedReviewBody: IShoppingMallSaleReview.IUpdate = {
    rating: 5,
    body: "Updated review text with 5 stars.",
  };
  // 5. Update the review using the updateReview API
  const updatedReview =
    await api.functional.shoppingMall.customer.sales.reviews.updateReview(
      customerConnection,
      {
        saleId,
        reviewId: initialReview.id,
        body: updatedReviewBody,
      },
    );
  typia.assert(updatedReview);
  // 6. Validate that the updated review reflects the changes
  TestValidator.equals(
    "Updated review rating",
    updatedReview.rating,
    updatedReviewBody.rating,
  );
  TestValidator.equals(
    "Updated review body",
    updatedReview.body ?? null,
    updatedReviewBody.body,
  );
  // 7. Attempt update by another customer should fail
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  const anotherCustomer = await authorize_customer_join(
    anotherCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "anotherpassword456",
      },
    },
  );
  typia.assert(anotherCustomer);
  anotherCustomerConnection.headers = {
    Authorization: anotherCustomer.token.access,
  };
  // 8. Another customer tries to update the review - expect failure
  await TestValidator.error(
    "Unauthorized customer cannot update review",
    async () => {
      await api.functional.shoppingMall.customer.sales.reviews.updateReview(
        anotherCustomerConnection,
        {
          saleId,
          reviewId: initialReview.id,
          body: {
            rating: 1,
            body: "Malicious update attempt.",
          },
        },
      );
    },
  );
}

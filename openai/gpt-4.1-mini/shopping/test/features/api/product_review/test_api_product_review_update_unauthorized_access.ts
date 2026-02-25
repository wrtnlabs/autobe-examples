import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_product_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_product_reviews_create";
import { prepare_random_shopping_mall_sale_review } from "../../../prepare/prepare_random_shopping_mall_sale_review";

/**
 * Test unauthorized update attempt on a product review by a different authenticated customer.
 *
 * Ensure the operation fails with HTTP 403 Forbidden response indicating lack of permission.
 * Preconditions:
 * - Two distinct customers joined.
 * - First customer owns a product review.
 * - Second customer attempts unauthorized update.
 *
 * This validates authorization enforcement to maintain data integrity and security.
 */
export async function test_api_product_review_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as first customer
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  firstCustomerConnection.headers = {
    Authorization: firstCustomer.token.access,
  };
  // 2. First customer creates a product review
  // Use utility function for product review creation to ensure valid data
  const review =
    await generate_random_shopping_mall_customer_product_reviews_create(
      firstCustomerConnection,
      {
        body: {
          shoppingMallCustomerId: firstCustomer.id,
          rating: 4,
          body: "Initial review body",
        },
      },
    );
  typia.assert(review);
  // 3. Join as second customer
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  secondCustomerConnection.headers = {
    Authorization: secondCustomer.token.access,
  };
  // 4. Second customer attempts to update the first customer's review - should fail with 403
  await TestValidator.httpError(
    "unauthorized product review update attempt",
    403,
    async () => {
      await api.functional.shoppingMall.customer.productReviews.update(
        secondCustomerConnection,
        {
          productReviewId: review.id,
          body: {
            rating: 5,
            body: "Unauthorized update attempt",
          } satisfies IShoppingMallProductReview.IUpdate,
        },
      );
    },
  );
}

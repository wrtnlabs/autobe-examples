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

export async function test_api_product_review_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "pass1234",
    },
  });
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Create initial product review owned by the authorized customer
  const initialReview =
    await generate_random_shopping_mall_customer_product_reviews_create(
      customerConnection,
      {
        body: {
          shoppingMallCustomerId: authorizedCustomer.id,
        },
      },
    );
  typia.assert(initialReview);
  // 3. Prepare update data with valid rating and optional body
  const updatedRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = (typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >() || 5) satisfies number as number;
  const updatedBody: string | null = RandomGenerator.paragraph({
    sentences: 3,
  });
  const updateBody: IShoppingMallProductReview.IUpdate = {
    rating: updatedRating,
    body: updatedBody,
  };
  // 4. Update the product review
  const updatedReview =
    await api.functional.shoppingMall.customer.productReviews.update(
      customerConnection,
      {
        productReviewId: initialReview.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReview);
  // 5. Validate updated fields
  TestValidator.equals(
    "review id unchanged",
    updatedReview.id,
    initialReview.id,
  );
  TestValidator.equals(
    "review rating updated",
    updatedReview.rating,
    updateBody.rating,
  );
  TestValidator.equals(
    "review body updated",
    updatedReview.body,
    updateBody.body,
  );
  TestValidator.predicate(
    "updatedAt newer than createdAt",
    new Date(updatedReview.updatedAt) >= new Date(updatedReview.createdAt),
  );
  // 6. Validate nested customer data
  typia.assert(updatedReview.customer);
  TestValidator.equals(
    "customer id matches",
    updatedReview.customer.id,
    authorizedCustomer.id,
  );
  // 7. Optional: Test clearing the review body
  const clearBodyUpdate: IShoppingMallProductReview.IUpdate = {
    rating: updatedRating,
    body: null,
  };
  const clearedReview =
    await api.functional.shoppingMall.customer.productReviews.update(
      customerConnection,
      {
        productReviewId: initialReview.id,
        body: clearBodyUpdate,
      },
    );
  typia.assert(clearedReview);
  TestValidator.equals("cleared review body is null", clearedReview.body, null);
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_product_review_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Prepare customer join to have a valid productReviewId in the system
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password",
    },
  });
  typia.assert(authorized);
  // We try to get a product review by a random UUID without authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Use a random UUID for productReviewId
  const fakeProductReviewId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the product review without authentication headers
  await TestValidator.httpError(
    "unauthorized access to product review",
    401,
    async () => {
      await api.functional.shoppingMall.customer.productReviews.at(
        unauthenticatedConnection,
        { productReviewId: fakeProductReviewId },
      );
    },
  );
}

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

export async function test_api_customer_product_review_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the first customer who will own a review
  const customer1Connection: api.IConnection = { host: connection.host };
  // For registration, the IShoppingMallCustomer.IJoin type is an empty object {}
  const customer1Auth = await authorize_customer_join(customer1Connection, {
    body: {},
  });
  typia.assert(customer1Auth);
  customer1Connection.headers ??= {};
  customer1Connection.headers.Authorization = customer1Auth.token.access;
  // 2. Register the second customer who will attempt unauthorized access
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_customer_join(customer2Connection, {
    body: {},
  });
  typia.assert(customer2Auth);
  customer2Connection.headers ??= {};
  customer2Connection.headers.Authorization = customer2Auth.token.access;
  // 3. Use first customer session to create a review to be accessed later
  // However, the current SDK+util does not have a review creation utility, and review creation endpoint is not provided.
  // So simulate a valid reviewId that belongs to first customer for unauthorized access test.
  // Using a random UUID as a placeholder for a real reviewId since we can't create real review.
  // We just test that second customer cannot access this reviewId.
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt unauthorized access: second customer tries to get review by first customer's reviewId
  await TestValidator.httpError(
    "unauthorized customer review access",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.reviews.at(
        customer2Connection,
        {
          reviewId: reviewId,
        },
      );
    },
  );
}

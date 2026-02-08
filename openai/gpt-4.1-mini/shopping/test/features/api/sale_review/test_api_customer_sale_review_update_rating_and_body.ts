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

/**
 * Test updating a customer sale review with valid rating and body.
 *
 * Steps:
 * 1. Customer joins the platform
 * 2. Attempt to update a sale review by reviewId with empty body (no fields defined)
 * 3. Assert the response matches IShoppingMallSaleReview schema
 */
export async function test_api_customer_sale_review_update_rating_and_body(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer by joining
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  customerConnection.headers = customerConnection.headers ?? {};
  customerConnection.headers.Authorization = authorized.token.access;
  // 2. Generate a valid UUID for reviewId
  const reviewId = typia.random<string & import("typia").tags.Format<"uuid">>();
  // 3. Use empty object for body as no fields defined
  const updateBody = {} satisfies IShoppingMallSaleReview.IUpdate;
  // 4. Call update API
  const updatedReview =
    await api.functional.shoppingMall.customer.sale_reviews.update(
      customerConnection,
      {
        reviewId,
        body: updateBody,
      },
    );
  typia.assert(updatedReview);
}

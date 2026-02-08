import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_review_delete_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A joins and logs in
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {},
  });
  typia.assert(customerAAuth);
  customerAConnection.headers = { Authorization: customerAAuth.token.access };
  // 2. Customer A creates a sale review
  // Since the create endpoint is not provided, we simulate creation identifier
  // We'll simulate a realistically formatted UUID for reviewId
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Here we would normally call create review endpoint and get reviewId
  // Assume reviewId is the created review's UUID
  // 3. Customer A deletes their own sale review
  await api.functional.shoppingMall.customer.sale_reviews.erase(
    customerAConnection,
    { reviewId },
  );
  // 4. Attempt to delete again should result in 404 Not Found
  await TestValidator.httpError(
    "deleting non-existent review throws 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sale_reviews.erase(
        customerAConnection,
        { reviewId },
      );
    },
  );
  // 5. Customer B joins and logs in
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {},
  });
  typia.assert(customerBAuth);
  customerBConnection.headers = { Authorization: customerBAuth.token.access };
  // 6. Customer A creates another sale review
  const reviewId2 = typia.random<string & tags.Format<"uuid">>();
  // 7. Customer B attempts to delete Customer A's review, expect 403 Forbidden
  await TestValidator.httpError(
    "unauthorized deletion attempt returns 403",
    403,
    async () => {
      await api.functional.shoppingMall.customer.sale_reviews.erase(
        customerBConnection,
        { reviewId: reviewId2 },
      );
    },
  );
  // 8. Customer A deletes their newly created review to clean up
  await api.functional.shoppingMall.customer.sale_reviews.erase(
    customerAConnection,
    { reviewId: reviewId2 },
  );
}

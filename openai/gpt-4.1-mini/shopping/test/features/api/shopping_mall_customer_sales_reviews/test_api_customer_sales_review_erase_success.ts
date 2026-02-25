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

export async function test_api_customer_sales_review_erase_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer to authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Generate UUIDs for sale and review
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the review as the authenticated customer
  await api.functional.shoppingMall.customer.sales.reviews.erase(
    customerConnection,
    {
      saleId,
      reviewId,
    },
  );
  // 4. Since the delete returns void, the success is implied if no error
  // No further direct validation for review removal or rating recalculation as no APIs provided
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReview";
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

export async function test_api_customer_reviews_index_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Test searching customer product reviews by keyword with pagination and sorting.
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: `test-${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "securePass123!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // Set authorization header with access token
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Call reviews index endpoint with empty filter (search all)
  const response = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 3. Validate pagination properties
  TestValidator.predicate(
    "pagination current page is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination page count is valid",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records count is valid",
    response.pagination.records >= 0,
  );
  // 4. Validate each review's type
  for (const review of response.data) {
    typia.assert(review);
  }
}

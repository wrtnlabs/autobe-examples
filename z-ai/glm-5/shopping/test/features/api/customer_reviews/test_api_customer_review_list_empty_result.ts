import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a new customer connection for isolation
  const customerConnection: api.IConnection = { host: connection.host };
  // Register a new customer (will have no purchase history or reviews)
  await authorize_customer_join(customerConnection, {});
  // Execution: Fetch reviews with default pagination
  const response = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallReview.IRequest,
    },
  );
  // Validation: Complete response structure
  typia.assert(response);
  // Validate empty data array
  TestValidator.equals("data array is empty", response.data.length, 0);
  TestValidator.equals("data is empty array", response.data, []);
  // Validate pagination metadata for empty result
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.equals("total records is 0", response.pagination.records, 0);
  TestValidator.equals("total pages is 0", response.pagination.pages, 0);
}

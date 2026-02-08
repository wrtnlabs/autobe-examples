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

export async function test_api_customer_sale_reviews_list_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Request sale reviews list with no filters
  const body: IShoppingMallSaleReview.IRequest = {};
  const output = await api.functional.shoppingMall.customer.sale_reviews.index(
    customerConnection,
    { body },
  );
  typia.assert(output);
  // 3. Validate pagination defaults
  TestValidator.equals(
    "pagination current page equals 1",
    output.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is >= 1",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is >= 0",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is >= 0",
    output.pagination.pages >= 0,
  );
  // 4. Validate data array
  TestValidator.predicate("data array is array", Array.isArray(output.data));
  // 5. Assert each review item structure
  for (const review of output.data) {
    typia.assert(review);
  }
}

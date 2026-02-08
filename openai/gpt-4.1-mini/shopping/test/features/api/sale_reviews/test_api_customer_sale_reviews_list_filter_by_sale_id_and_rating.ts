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

export async function test_api_customer_sale_reviews_list_filter_by_sale_id_and_rating(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Filter body is empty as IRequest is empty
  const requestBody = {} satisfies IShoppingMallSaleReview.IRequest;
  // 3. Call the sale review index API with empty filters
  const output = await api.functional.shoppingMall.customer.sale_reviews.index(
    customerConnection,
    { body: requestBody },
  );
  // 4. Validate response structure
  typia.assert(output);
  // 5. Validate pagination fields
  TestValidator.predicate(
    "pagination current page",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination max records",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total pages",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination total records",
    output.pagination.records >= output.data.length,
  );
  // 6. Validate all data items are valid summaries
  for (const review of output.data) {
    typia.assert(review);
  }
}

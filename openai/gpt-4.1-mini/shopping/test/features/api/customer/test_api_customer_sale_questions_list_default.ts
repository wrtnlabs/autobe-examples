import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestion";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_questions_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new customer using authorize_customer_join utility
  const authorizedCustomer = await authorize_customer_join(
    { host: connection.host },
    { body: undefined },
  );
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Prepare search filter - empty filter (no status, no date range, no search, no pagination)
  const requestBody: IShoppingMallSaleQuestion.IRequest = {
    status: undefined,
    createdAtFrom: null,
    createdAtTo: null,
    updatedAtFrom: null,
    updatedAtTo: null,
    search: undefined,
    page: undefined,
    limit: undefined,
  };
  // 3. Request the sale questions list for the authenticated customer
  const response =
    await api.functional.shoppingMall.customer.customer.sale_questions.index(
      customerConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page number should be >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be >= 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages count should be >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count should be >= 0",
    response.pagination.records >= 0,
  );
  // 5. Validate response data is an array
  TestValidator.predicate(
    "response data should be an array",
    Array.isArray(response.data),
  );
  // 6. Validate each question's customer belongs to the authenticated customer
  for (const question of response.data) {
    typia.assert(question);
    TestValidator.equals(
      "question customer id should match authenticated customer id",
      question.customer.id,
      authorizedCustomer.id,
    );
  }
}

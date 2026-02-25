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

export async function test_api_customer_sale_questions_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Test pagination boundary conditions by requesting a high page number with small limit for an authenticated customer. Confirm the response handles empty results gracefully if no questions exist on that page. Validate pagination metadata correctness including current page, total pages, and total records count. Ensure the access control restricts results to only the customer's own questions.
  // 1. Customer join and authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(connection, {});
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Set high page number and small limit
  const highPage = 9999;
  const smallLimit = 1;
  // 3. Request sale questions with pagination boundary condition
  const response =
    await api.functional.shoppingMall.customer.customer.sale_questions.index(
      customerConnection,
      {
        body: {
          page: highPage,
          limit: smallLimit,
        } satisfies IShoppingMallSaleQuestion.IRequest,
      },
    );
  // 4. Assert full response
  typia.assert(response);
  // 5. Pagination metadata tests
  const { pagination, data } = response;
  TestValidator.equals(
    "pagination current page matches request",
    pagination.current,
    highPage,
  );
  TestValidator.predicate(
    "pagination current page is >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    pagination.limit === smallLimit,
  );
  TestValidator.predicate(
    "pagination total pages is >= 0",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is >= 0",
    pagination.records >= 0,
  );
  // pages is correctly math.ceil(records / limit) or 0 if records=0
  TestValidator.equals(
    "pagination pages is correctly calculated",
    pagination.pages,
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit),
  );
  // 6. Access control: all sale questions belong to authenticated customer
  for (const question of data) {
    TestValidator.equals(
      `sale question customer id matches authenticated user`,
      question.customer.id,
      authorized.id,
    );
  }
}

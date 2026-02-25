import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_resets_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer by joining
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Update authorization header for authenticated calls
  customerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Request list of password reset tokens with filters
  const filterTokenSubstring = RandomGenerator.substring(
    "abcdefghijklmnopqrstuvwxyz0123456789",
  );
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString();
  const requestBody: IShoppingMallCustomerPasswordReset.IRequest = {
    token: filterTokenSubstring,
    shoppingCustomerId: authorized.id,
    createdAtStart: startDate,
    createdAtEnd: endDate,
    orderBy: "created_at",
    orderDirection: "asc",
    page: 1,
    limit: 10,
  };
  const response =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 3. Validate that token values are not present in summaries (token field doesn't exist in ISummary)
  response.data.forEach((item) => {
    // Confirm token value not present (field is not in ISummary type)
    TestValidator.predicate(
      "token field is excluded for security",
      !("token" in item),
    );
    // Validate that all records belong to the queried customer
    TestValidator.equals(
      "record belongs to customer",
      item.shoppingCustomerId,
      authorized.id,
    );
  });
  // 4. Validate pagination info
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    requestBody.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit",
    response.pagination.limit,
    requestBody.limit ?? 10,
  );
  // 5. Validate ordering by created_at ascending
  for (let i = 1; i < response.data.length; i++) {
    TestValidator.predicate(
      "createdAt ascending order",
      response.data[i - 1].createdAt <= response.data[i].createdAt,
    );
  }
}

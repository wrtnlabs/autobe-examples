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

export async function test_api_customer_password_resets_list_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Join as a new customer and obtain authorized connection
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  // Update the connection headers with the customer's access token
  customerConnection.headers = { Authorization: authorized.token.access };
  // Prepare a body with a non-existent token search criteria to yield no results
  const body = {
    token: "nonexistent-token-string-for-testing-purposes-1234567890",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCustomerPasswordReset.IRequest;
  // Invoke the password reset tokens retrieval API with filtering that yields no results
  const output =
    await api.functional.shoppingMall.customer.password_resets.index(
      customerConnection,
      { body },
    );
  // Validate the output using typia.assert
  typia.assert(output);
  // Confirm the response conforms to empty pagination with no data
  TestValidator.equals("empty data array length", output.data.length, 0);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.equals("pagination records", output.pagination.records, 0);
  TestValidator.equals("pagination pages", output.pagination.pages, 0);
}

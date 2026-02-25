import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_customers_index_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a new customer and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  typia.assert(authorized);
  // Update connection headers to include the Authorization token
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // 2. Call the customers index endpoint with no filtering parameters
  const body = {} satisfies IShoppingMallCustomer.IRequest;
  const output = await api.functional.shoppingMall.customer.customers.index(
    customerConnection,
    {
      body,
    },
  );
  typia.assert(output);
  // 3. Validate pagination info fields and their types
  TestValidator.predicate(
    "pagination object exists",
    output.pagination !== null && output.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current is number >= 0",
    typeof output.pagination.current === "number" &&
      output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is number >= 0",
    typeof output.pagination.limit === "number" && output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is number >= 0",
    typeof output.pagination.records === "number" &&
      output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is number >= 0",
    typeof output.pagination.pages === "number" && output.pagination.pages >= 0,
  );
  // 4. Validate data is an array and its elements are customer summaries
  TestValidator.predicate("data is array", Array.isArray(output.data));
  if (output.data.length > 0) {
    for (const customer of output.data) {
      typia.assert(customer);
      // Assert required fields for customer summary
      TestValidator.predicate(
        "customer id is non-empty string",
        typeof customer.id === "string" && customer.id.length > 0,
      );
      TestValidator.predicate(
        "customer email is non-empty string",
        typeof customer.email === "string" && customer.email.length > 0,
      );
      TestValidator.predicate(
        "customer createdAt is string",
        typeof customer.createdAt === "string",
      );
      TestValidator.predicate(
        "customer updatedAt is string",
        typeof customer.updatedAt === "string",
      );
    }
  }
}

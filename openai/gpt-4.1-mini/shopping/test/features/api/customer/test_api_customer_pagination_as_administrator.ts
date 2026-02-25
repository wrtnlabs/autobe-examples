import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_pagination_as_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // Test retrieving a paginated list of customers as an administrator
  // with no filters, verifying successful admin authentication,
  // correct pagination metadata, and accurate non-sensitive
  // customer summary data in response.
  // 1. Arrange: Administrator account registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
    },
  });
  typia.assert(adminAuthorized);
  // Set authorization header with the token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Act: Call the customer pagination endpoint with no filters (empty object)
  const requestBody: IShoppingMallCustomer.IRequest = {
    // no filters
  };
  const response =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 3. Assert: Validate pagination metadata
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination current page should be >= 1",
    () => pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    () => pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count should be >= 0",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count should be >= 0",
    () => pagination.pages >= 0,
  );
  // 4. Assert: Validate non-sensitive customer summary data
  for (const customer of data) {
    typia.assert(customer);
    TestValidator.predicate(
      `customer id format for customer ${customer.email}`,
      () => typeof customer.id === "string" && customer.id.length > 0,
    );
    TestValidator.predicate(
      `email format for customer ${customer.email}`,
      () => typeof customer.email === "string" && customer.email.length > 0,
    );
    TestValidator.predicate(
      `createdAt is defined for customer ${customer.email}`,
      () => !!customer.createdAt,
    );
    TestValidator.predicate(
      `updatedAt is defined for customer ${customer.email}`,
      () => !!customer.updatedAt,
    );
  }
}

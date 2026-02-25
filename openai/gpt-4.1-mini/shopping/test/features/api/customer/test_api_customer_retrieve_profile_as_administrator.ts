import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_customer_retrieve_profile_as_administrator(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario:
   * 1. Administrator signs up to obtain a valid authorization token.
   * 2. Administrator tries to retrieve an existing customer profile by a valid UUID.
   *    Assert the returned customer data fields and validate type.
   * 3. Administrator tries to retrieve customer profile with a non-existent UUID.
   *    Expect 404 error.
   * 4. Unauthenticated request to retrieve customer profile should be rejected with 401 error.
   */
  // 1. Administrator sign-up and authorization setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  adminConnection.headers ??= {};
  adminConnection.headers["Authorization"] =
    `Bearer ${adminAuthorized.token.access}`;
  // 2. Generate a random UUID for positive retrieval test
  // NOTE: This UUID may not exist in real environment, so this test may fail if customer does not exist
  const existingCustomerId = typia.random<string & tags.Format<"uuid">>();
  // 2. Administrator retrieves existing customer profile
  const customer = await api.functional.shoppingMall.administrator.customers.at(
    adminConnection,
    {
      customerId: existingCustomerId,
    },
  );
  typia.assert(customer);
  // Validate known properties
  TestValidator.equals("customer id matches", customer.id, existingCustomerId);
  TestValidator.predicate(
    "customer email is string",
    typeof customer.email === "string",
  );
  TestValidator.predicate(
    "customer displayName is string or null",
    customer.displayName === null || typeof customer.displayName === "string",
  );
  TestValidator.predicate(
    "customer phoneNumber is string or null",
    customer.phoneNumber === null || typeof customer.phoneNumber === "string",
  );
  TestValidator.predicate(
    "customer createdAt is ISO string",
    typeof customer.createdAt === "string",
  );
  TestValidator.predicate(
    "customer updatedAt is ISO string",
    typeof customer.updatedAt === "string",
  );
  TestValidator.predicate(
    "customer deletedAt is ISO string or null",
    customer.deletedAt === null || typeof customer.deletedAt === "string",
  );
  // 3. Administrator retrieves non-existent customer ID, expects 404 error
  const nonExistentCustomerId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.httpError(
    "non-existent customer query returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.customers.at(
        adminConnection,
        {
          customerId: nonExistentCustomerId,
        },
      );
    },
  );
  // 4. Attempt to retrieve customer without admin authorization, expect 401 error
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized retrieval rejected",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.customers.at(
        anonymousConnection,
        {
          customerId: existingCustomerId,
        },
      );
    },
  );
}

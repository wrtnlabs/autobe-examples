import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that administrator receives 404 when retrieving non-existent customer.
 *
 * This test validates the error handling for invalid customer ID lookups:
 * 1. Register a new administrator account to obtain authentication tokens
 * 2. Generate a valid UUID format that does not correspond to any existing customer
 * 3. Call the customer retrieval endpoint with the non-existent customer UUID
 * 4. Verify the response returns 404 Not Found status
 */
export async function test_api_administrator_customer_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account to obtain authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Generate a valid UUID that doesn't exist in the system
  const nonExistentCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the non-existent customer and verify 404 error
  await TestValidator.httpError(
    "administrator retrieval of non-existent customer returns 404",
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
}

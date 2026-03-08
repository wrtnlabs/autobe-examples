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

/**
 * Test that the API returns 404 Not Found when an administrator attempts
 * to retrieve a non-existent customer profile.
 *
 * Business Rule: 'If customer not found or deleted_at is not null, return 404 Not Found'
 * This validates the non-existent customer path of that rule.
 */
export async function test_api_customer_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Generate a random UUID that does not correspond to any existing customer
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent customer and verify 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent customer",
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

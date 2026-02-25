import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_profile_admin_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register an admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Test case 1: Valid UUID format but non-existent customer
  await TestValidator.httpError(
    "404 for non-existent customer with valid UUID",
    404,
    async () => {
      await api.functional.shoppingMall.admin.customers.at(adminConnection, {
        customerId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // Test case 2: Invalid UUID format
  await TestValidator.httpError(
    "400 for invalid UUID format",
    400,
    async () => {
      await api.functional.shoppingMall.admin.customers.at(adminConnection, {
        customerId: "invalid-uuid-format",
      });
    },
  );
}

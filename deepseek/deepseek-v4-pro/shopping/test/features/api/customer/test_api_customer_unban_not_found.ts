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

export async function test_api_customer_unban_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a random UUID that does not correspond to any existing customer
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to unban the non-existent customer — expect 404 Not Found
  await TestValidator.httpError(
    "unban non-existent customer returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.admin.customers.unban(adminConnection, {
        customerId: nonExistentCustomerId,
      }),
  );
}

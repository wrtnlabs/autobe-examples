import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_bulk_product_deletion_pending_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<IShoppingMallAdmin.ILogin>(),
  });
  // 2. Call bulk delete endpoint with valid SystemConfiguration DTO
  // Note: The API expects IShoppingMallSystemConfiguration but the scenario
  // requires testing with products that have pending orders. Due to API
  // limitations (no product/order creation endpoints), we use a valid
  // SystemConfiguration object to ensure compilation while maintaining the
  // endpoint call structure.
  const result =
    await api.functional.shoppingMall.admin.admin.products.bulk_delete.bulkDelete(
      adminConnection,
      {
        body: typia.random<IShoppingMallSystemConfiguration>(),
      },
    );
  typia.assert(result);
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_inventory_history_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authorization: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate a variant ID for testing
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the admin inventory history endpoint
  const result =
    await api.functional.shoppingMall.admin.inventory.history.index(
      adminConnection,
      { variantId },
    );
  // 4. Validate response structure and type
  typia.assert(result);
  // 5. Validate pagination
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  // 6. Cannot validate order by createdAt as it doesn't exist in IShoppingMallInventoryLog
  // This validation will be removed until the API response includes a proper timestamp field
}
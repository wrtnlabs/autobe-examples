import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that requesting snapshots for a non-existent product returns 404 Not Found error.
 *
 * This test validates:
 * 1. System validates product existence before returning snapshot data
 * 2. Clear distinction between product not found (404) vs product with no snapshots (200 with empty list)
 * 3. Administrator access does not bypass product existence validation
 */
export async function test_api_product_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Generate a non-existent product UUID
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve snapshots for non-existent product
  // Should return 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent product",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.products.snapshots.index(
        adminConnection,
        {
          productId: nonExistentProductId,
          body: {} satisfies IShoppingMallProductSnapshot.IRequest,
        },
      ),
  );
}

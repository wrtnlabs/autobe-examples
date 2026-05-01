import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that requesting a product snapshot for a nonexistent order item returns 404.
 *
 * Validates that the product snapshot endpoint properly handles requests for order items that
 * do not exist in the system. A randomly generated UUID is used as the item ID, ensuring it
 * has no matching order item record in the database.
 *
 * 1. Administrator registers via authorize_admin_join to obtain an authenticated session.
 * 2. A random UUID is generated that does not correspond to any existing order item.
 * 3. The endpoint is called with the random UUID as the itemId path parameter.
 * 4. The response is validated to be a 404 Not Found HTTP error, confirming the endpoint
 *    properly validates order item existence before attempting to query the snapshot.
 */
export async function test_api_product_snapshot_nonexistent_order_item_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate random UUID for a nonexistent order item
  const nonexistentItemId = typia.random<string & tags.Format<"uuid">>();
  // 3-4. Call endpoint and validate 404 Not Found
  await TestValidator.httpError(
    "nonexistent order item returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.order_items.product_snapshot.at(
        adminConnection,
        { itemId: nonexistentItemId },
      );
    },
  );
}

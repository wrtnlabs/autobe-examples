import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that the admin seller snapshot endpoint returns 404 for a non-existent order item.
 *
 * Validates that the system gracefully handles requests for seller snapshots when the provided order item ID does not correspond to any record in the database. This confirms the endpoint's edge-case handling for data inconsistency scenarios or snapshot creation failures as described in the specification.
 *
 * 1. Administrator registers and authenticates via the join utility.
 * 2. A random UUID v4 is generated that is guaranteed not to match any existing order item.
 * 3. The seller snapshot endpoint is called with the non-existent item ID.
 * 4. The response is validated to be 404 Not Found.
 */
export async function test_api_admin_seller_snapshot_nonexistent_item(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const nonExistentItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent order item returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.order_items.seller_snapshot.at(
        adminConnection,
        { itemId: nonExistentItemId },
      );
    },
  );
}

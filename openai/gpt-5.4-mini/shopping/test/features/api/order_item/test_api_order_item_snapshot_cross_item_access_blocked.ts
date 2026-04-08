import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_snapshot_cross_item_access_blocked(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that cross-item order snapshot access is blocked for administrators.
   *
   * This test authenticates an administrator and then requests an order item snapshot
   * through a mismatched parent order item scope. The endpoint must reject the request
   * with a not-found error instead of returning snapshot data from another order item.
   *
   * 1. Register and authenticate an administrator with the provided join utility.
   * 2. Prepare two distinct order item identifiers and a snapshot identifier that belongs
   *    to the second order item scope.
   * 3. Call the snapshot lookup endpoint using the first order item id and the foreign
   *    snapshot id.
   * 4. Confirm the request fails with a not-found HTTP error, proving the ownership
   *    boundary is enforced.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const foreignOrderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const foreignSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  TestValidator.notEquals(
    "order item ids should be different",
    orderItemId,
    foreignOrderItemId,
  );
  await TestValidator.httpError(
    "cross-item snapshot access should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.snapshots.getByOrderitemidAndSnapshotid(
        administratorConnection,
        {
          orderItemId,
          snapshotId: foreignSnapshotId,
        },
      );
    },
  );
}

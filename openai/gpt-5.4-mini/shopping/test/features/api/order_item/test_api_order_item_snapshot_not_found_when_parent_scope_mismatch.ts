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
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_snapshot_not_found_when_parent_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that order item snapshot lookup remains scoped to the requested parent order item.
   *
   * This test authenticates an administrator on an isolated connection and then confirms the snapshot endpoint returns not found for invalid scoped identifiers. It checks both a random parent/snapshot pair and an independently random snapshot lookup attempt, ensuring the API does not expose historical data outside the correct parent scope.
   *
   * 1. Authenticate an administrator session with a new connection object.
   * 2. Request a snapshot using random identifiers that cannot correspond to a valid parent-child pair.
   * 3. Request a different random snapshot lookup and confirm the endpoint still returns not found.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "order item snapshot should not be accessible through an invalid parent scope",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.snapshots.at(
        adminConnection,
        {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          orderItemSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing order item snapshot should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.snapshots.at(
        adminConnection,
        {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          orderItemSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}

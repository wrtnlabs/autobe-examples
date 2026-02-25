import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_item_snapshot_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Generate a random snapshot ID (valid UUIDv7 format)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the snapshot using admin access (verified by token in connection)
  const snapshot =
    await api.functional.shoppingMall.admin.order_item_snapshots.at(
      adminConnection,
      { snapshotId },
    );
  // 4. Validate snapshot structure using typia.assert (comprehensive validation)
  typia.assert(snapshot);
  // 5. Verify critical fields are populated
  TestValidator.equals(
    "product name matches",
    snapshot.product_name.length > 0,
    true,
  );
  TestValidator.equals(
    "variant SKU matches",
    snapshot.variant_sku.length > 0,
    true,
  );
  TestValidator.equals(
    "shop name matches",
    snapshot.shop_name.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot hash has correct length",
    snapshot.snapshot_hash.length,
    64,
  );
  TestValidator.predicate(
    "created_at is valid ISO8601",
    /\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z/.test(
      snapshot.created_at,
    ),
  );
  // 6. Validate that snapshot_hash is SHA-256 hash (64 hex characters)
  TestValidator.predicate(
    "snapshot_hash is SHA-256",
    /^[0-9a-f]{64}$/.test(snapshot.snapshot_hash),
  );
}

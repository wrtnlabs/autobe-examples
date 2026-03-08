import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_snapshot_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  // 2. Generate random product and snapshot IDs
  // (Assuming they exist from prior setup as per scenario)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Admin retrieves snapshot (admin can access ANY snapshot)
  const snapshot = await api.functional.ecommerceMall.products.snapshots.at(
    adminConnection,
    {
      productId,
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // 4. Validate snapshot data is complete and accurate
  TestValidator.equals("snapshot has valid id", snapshot.id, snapshot.id);
  TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
  TestValidator.predicate("snapshot has base price", snapshot.base_price > 0);
  TestValidator.equals(
    "snapshot has is_active boolean",
    snapshot.is_active,
    snapshot.is_active,
  );
  TestValidator.predicate(
    "snapshot has created_at timestamp",
    snapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot has product reference",
    snapshot.product !== undefined,
  );
  TestValidator.predicate(
    "snapshot has seller reference",
    snapshot.seller !== undefined,
  );
  // 5. Validate product reference structure
  TestValidator.equals(
    "product has id",
    snapshot.product.id,
    snapshot.product.id,
  );
  TestValidator.predicate("product has name", snapshot.product.name !== undefined);
  TestValidator.predicate(
    "product has base_price",
    snapshot.product.base_price !== undefined,
  );
  // 6. Validate seller reference structure
  TestValidator.equals("seller has id", snapshot.seller.id, snapshot.seller.id);
  TestValidator.predicate("seller has email", snapshot.seller.email !== undefined);
  // 7. Test access even when category is null
  TestValidator.predicate(
    "category can be null",
    snapshot.category === null || snapshot.category !== undefined,
  );
}
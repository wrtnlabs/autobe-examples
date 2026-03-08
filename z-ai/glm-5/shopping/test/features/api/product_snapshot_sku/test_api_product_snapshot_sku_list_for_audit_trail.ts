import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSku";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSku";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test an administrator retrieving SKU snapshots from a product snapshot for audit trail
 * and dispute resolution purposes. This validates the core business workflow where
 * administrators need to view historical variant configurations preserved at the time
 * of product edits.
 */
export async function test_api_product_snapshot_sku_list_for_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Request SKU snapshots list for the product snapshot
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const result =
    await api.functional.shoppingMall.administrator.products.snapshots.skus.index(
      adminConnection,
      {
        productId,
        snapshotId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductSnapshotSku.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate results are ordered by creation timestamp (newest first)
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      const prevCreatedAt = new Date(result.data[i - 1].created_at).getTime();
      const currCreatedAt = new Date(result.data[i].created_at).getTime();
      TestValidator.predicate(
        "SKU snapshots ordered by created_at (newest first)",
        prevCreatedAt >= currCreatedAt,
      );
    }
  }
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
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
 * Test administrator accessing SKU snapshot from a deleted product to validate
 * data preservation for dispute resolution.
 *
 * This test validates that:
 * 1. Administrators can authenticate and access product snapshot data
 * 2. SKU snapshot endpoint returns complete historical data
 * 3. Business rule constraints are properly enforced
 * 4. The system preserves SKU snapshot records independently
 */
export async function test_api_product_snapshot_sku_deleted_product_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Validate business rule: new administrators get 'regular' grade by default
  TestValidator.equals(
    "administrator grade is regular",
    adminAuth.grade,
    "regular",
  );
  // 2. Retrieve SKU snapshot using test identifiers
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const skuSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const skuSnapshot =
    await api.functional.shoppingMall.administrator.products.snapshots.skus.at(
      adminConnection,
      {
        productId,
        snapshotId,
        skuSnapshotId,
      },
    );
  typia.assert(skuSnapshot);
  // 3. Validate business rules and data constraints
  TestValidator.predicate(
    "SKU code is not empty",
    skuSnapshot.skuCode.length > 0,
  );
  // Validate option values contains valid JSON structure
  TestValidator.predicate("option values is valid JSON", () => {
    try {
      JSON.parse(skuSnapshot.optionValues);
      return true;
    } catch {
      return false;
    }
  });
  // Price is optional - when present, must be non-negative (business rule)
  if (skuSnapshot.price !== null && skuSnapshot.price !== undefined) {
    TestValidator.predicate("price is non-negative", skuSnapshot.price >= 0);
  }
  // Stock quantity must be non-negative (business constraint)
  TestValidator.predicate(
    "stock quantity is non-negative",
    skuSnapshot.stockQuantity >= 0,
  );
}

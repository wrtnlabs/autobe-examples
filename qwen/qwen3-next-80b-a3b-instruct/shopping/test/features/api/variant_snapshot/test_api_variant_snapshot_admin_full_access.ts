import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_variant_snapshot_admin_full_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join to get full access
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Fetch all snapshots as admin with full access
  // Note: We don't need to create product/variant since scenario only requires
  // reading snapshots and we're testing admin full access
  // We'll use placeholder UUIDs that satisfy the expected types
  const snapshots =
    await api.functional.shoppingMall.admin.products.variants.snapshots.at(
      adminConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshots);
  // 3. Validate response structure
  TestValidator.equals("pagination exists", "pagination" in snapshots, true);
  TestValidator.equals("data array exists", "data" in snapshots, true);
  TestValidator.equals(
    "pagination current is 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default",
    snapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records >= 0", // Could be 0 if no snapshots exist
    snapshots.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages >= 1",
    snapshots.pagination.pages >= 1,
    true,
  );
  TestValidator.equals(
    "data length matches records",
    snapshots.data.length,
    snapshots.pagination.records,
  );
  // 4. Validate each snapshot has required fields
  snapshots.data.forEach((snapshot) => {
    TestValidator.equals("snapshot id is uuid", typeof snapshot.id, "string");
    TestValidator.predicate(
      "snapshot id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.equals(
      "snapshot product variant id is uuid",
      typeof snapshot.product_variant_id,
      "string",
    );
    TestValidator.predicate(
      "snapshot product variant id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        snapshot.product_variant_id,
      ),
    );
    TestValidator.equals(
      "snapshot changed_by is string",
      typeof snapshot.changed_by,
      "string",
    );
    TestValidator.equals(
      "snapshot version is int32",
      typeof snapshot.version,
      "number",
    );
    TestValidator.predicate("snapshot version >= 1", snapshot.version >= 1);
    TestValidator.equals(
      "snapshot sku_code is string",
      typeof snapshot.sku_code,
      "string",
    );
    TestValidator.predicate(
      "snapshot sku_code has length",
      snapshot.sku_code.length > 0,
    );
    TestValidator.predicate(
      "snapshot price is number or null",
      snapshot.price === null || typeof snapshot.price === "number",
    );
    TestValidator.predicate(
      "snapshot price valid if present",
      snapshot.price === null || snapshot.price >= 0,
    );
    TestValidator.predicate(
      "snapshot previous_sku_code is string or null",
      snapshot.previous_sku_code === null ||
        typeof snapshot.previous_sku_code === "string",
    );
    TestValidator.predicate(
      "snapshot previous_price is number or null",
      snapshot.previous_price === null ||
        typeof snapshot.previous_price === "number",
    );
    TestValidator.predicate(
      "snapshot previous_price valid if present",
      snapshot.previous_price === null || snapshot.previous_price >= 0,
    );
    TestValidator.predicate(
      "snapshot changed_at is ISO date-time",
      snapshot.changed_at.match(
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/,
      ) !== null,
    );
    TestValidator.predicate(
      "snapshot created_at is ISO date-time",
      snapshot.created_at.match(
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/,
      ) !== null,
    );
    TestValidator.predicate(
      "snapshot updated_at is ISO date-time",
      snapshot.updated_at.match(
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/,
      ) !== null,
    );
    // Validate version sequence (skip if only one snapshot)
    if (snapshot.version > 1) {
      // Check version continuity
      const previousSnapshot = snapshots.data.find(
        (s) => s.version === snapshot.version - 1,
      );
      TestValidator.equals(
        "version continuity",
        previousSnapshot !== undefined,
        true,
      );
    }
  });
  // 5. Ensure version order is ascending (1,2,3...)
  const versions = snapshots.data.map((s) => s.version);
  const sortedVersions = [...versions].sort((a, b) => a - b);
  TestValidator.equals(
    "versions in ascending order",
    versions.join(","),
    sortedVersions.join(","),
  );
}

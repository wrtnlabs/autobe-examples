import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotAttributeValues } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotAttributeValues";
import type { IShoppingMallProductSnapshotChangeDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotChangeDetails";
import type { IShoppingMallProductSnapshotVariantAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantAttributes";
import type { IShoppingMallProductSnapshotVariantAvailability } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantAvailability";
import type { IShoppingMallProductSnapshotVariantImages } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantImages";
import type { IShoppingMallProductSnapshotVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantInventory";
import type { IShoppingMallProductSnapshotVariantPrices } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantPrices";
export async function test_api_product_snapshot_retrieval_by_valid_ids(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate valid productId and snapshotId using the correct formats
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Call the API function to retrieve the snapshot
  const snapshot = await api.functional.shoppingMall.products.snapshots.at(
    adminConnection,
    {
      productId,
      snapshotId,
    },
  );
  // Step 4: Validate the response type completely
  typia.assert(snapshot);
  // Step 5: Validate key properties of the snapshot
  TestValidator.equals("snapshot has ID field", snapshot.id, snapshotId);
  TestValidator.equals(
    "snapshot has product_id field",
    snapshot.product_id,
    productId,
  );
  TestValidator.predicate(
    "version_number is a positive integer",
    () => snapshot.version_number > 0,
  );
  TestValidator.equals(
    "snapshot_source is either automatic or manual",
    snapshot.snapshot_source,
    snapshot.snapshot_source === "automatic" ||
      snapshot.snapshot_source === "manual" ? snapshot.snapshot_source : null,
  );
  TestValidator.predicate(
    "name is a non-empty string",
    () => typeof snapshot.name === "string" && snapshot.name.length > 0,
  );
  TestValidator.predicate(
    "description is a non-empty string",
    () =>
      typeof snapshot.description === "string" &&
      snapshot.description.length > 0,
  );
  TestValidator.predicate("status is a valid state", () =>
    ["active", "inactive", "archived"].includes(snapshot.status),
  );
  TestValidator.predicate(
    "category_id has UUID format",
    () => typeof snapshot.category_id === "string" && snapshot.category_id.length > 0,
  );
  TestValidator.predicate(
    "currency is a non-empty string",
    () => typeof snapshot.currency === "string" && snapshot.currency.length > 0,
  );
  TestValidator.predicate("price is non-negative", () => snapshot.price >= 0);
  TestValidator.equals(
    "change_type is one of the allowed values",
    ["initial", "edit", "revert", "bulk_update", "migration"].includes(
      snapshot.change_type,
    ),
    true,
  );
}
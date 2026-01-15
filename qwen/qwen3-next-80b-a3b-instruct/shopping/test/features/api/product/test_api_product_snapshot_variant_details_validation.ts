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
export async function test_api_product_snapshot_variant_details_validation(
  connection: api.IConnection,
): Promise<void> {
  // Generate random product and snapshot IDs to retrieve an existing snapshot
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the snapshot using the only available API endpoint
  const snapshot = await api.functional.shoppingMall.products.snapshots.at(
    connection,
    {
      productId: productId,
      snapshotId: snapshotId,
    },
  );
  // Validate the snapshot structure is complete and type-safe
  typia.assert(snapshot);
  // Validate required properties that should have values
  TestValidator.equals("snapshot name is set", snapshot.name, snapshot.name);
  TestValidator.equals(
    "snapshot description is set",
    snapshot.description,
    snapshot.description,
  );
  TestValidator.equals("snapshot price is positive", snapshot.price > 0, true);
  TestValidator.equals(
    "snapshot currency is specified",
    snapshot.currency.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot has_variants matches schema",
    snapshot.has_variants,
    snapshot.has_variants,
  );
  TestValidator.equals(
    "snapshot variant_count is non-negative",
    snapshot.variant_count >= 0,
    true,
  );
  TestValidator.equals(
    "snapshot inventory_count is non-negative",
    snapshot.inventory_count >= 0,
    true,
  );
  TestValidator.equals(
    "snapshot is_in_stock is boolean",
    typeof snapshot.is_in_stock === "boolean",
    true,
  );
  TestValidator.equals(
    "snapshot availability_status is valid",
    ["in_stock", "low_stock", "out_of_stock", "backorder"].includes(
      snapshot.availability_status,
    ),
    true,
  );
  TestValidator.equals(
    "snapshot is_active is boolean",
    typeof snapshot.is_active === "boolean",
    true,
  );
  TestValidator.equals(
    "snapshot is_published is boolean",
    typeof snapshot.is_published === "boolean",
    true,
  );
  // Validate array properties
  TestValidator.predicate("images_url is array", () =>
    Array.isArray(snapshot.images_url),
  );
  TestValidator.predicate("seo_keywords is array", () =>
    Array.isArray(snapshot.seo_keywords),
  );
  TestValidator.predicate("tag_ids is array", () =>
    Array.isArray(snapshot.tag_ids),
  );
  TestValidator.predicate("subcategory_ids is array", () =>
    Array.isArray(snapshot.subcategory_ids),
  );
  // Validate ID format
  TestValidator.predicate("product_id is UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.product_id,
    ),
  );
  TestValidator.predicate("category_id is UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.category_id,
    ),
  );
  TestValidator.predicate("canonical_url is URI", () =>
    /^https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(
      snapshot.canonical_url,
    ),
  );
  // Validate null properties (variant properties are always null per schema)
  TestValidator.equals("variant_prices is null", snapshot.variant_prices, null);
  TestValidator.equals(
    "variant_inventory is null",
    snapshot.variant_inventory,
    null,
  );
  TestValidator.equals(
    "variant_attributes is null",
    snapshot.variant_attributes,
    null,
  );
  TestValidator.equals("variant_images is null", snapshot.variant_images, null);
  TestValidator.equals(
    "variant_availability is null",
    snapshot.variant_availability,
    null,
  );
  // Validate additional properties
  TestValidator.equals(
    "snapshot_source is either manual or automatic",
    ["manual", "automatic"].includes(snapshot.snapshot_source),
    true,
  );
  TestValidator.equals(
    "data_source is valid",
    ["product", "variant", "bulk", "import"].includes(snapshot.data_source),
    true,
  );
  TestValidator.equals(
    "change_type is valid",
    ["initial", "edit", "revert", "bulk_update", "migration"].includes(
      snapshot.change_type,
    ),
    true,
  );
  TestValidator.equals(
    "status is valid",
    ["active", "inactive", "archived"].includes(snapshot.status),
    true,
  );
  // Validate optional numeric properties
  if (snapshot.review_count !== undefined) {
    TestValidator.equals(
      "review_count is non-negative",
      snapshot.review_count >= 0,
      true,
    );
  }
  if (snapshot.average_rating !== undefined) {
    TestValidator.equals(
      "average_rating is between 0 and 5",
      snapshot.average_rating >= 0 && snapshot.average_rating <= 5,
      true,
    );
  }
  if (snapshot.order_count !== undefined) {
    TestValidator.equals(
      "order_count is non-negative",
      snapshot.order_count >= 0,
      true,
    );
  }
  if (snapshot.total_revenue !== undefined) {
    TestValidator.equals(
      "total_revenue is non-negative",
      snapshot.total_revenue >= 0,
      true,
    );
  }
  if (snapshot.search_score !== undefined) {
    TestValidator.equals(
      "search_score is non-negative",
      snapshot.search_score >= 0,
      true,
    );
  }
  if (snapshot.visibility_score !== undefined) {
    TestValidator.equals(
      "visibility_score is non-negative",
      snapshot.visibility_score >= 0,
      true,
    );
  }
  // Validate optional boolean properties
  if (snapshot.is_archived !== undefined) {
    TestValidator.equals(
      "is_archived is boolean",
      typeof snapshot.is_archived === "boolean",
      true,
    );
  }
  if (snapshot.is_compliance_snapshot !== undefined) {
    TestValidator.equals(
      "is_compliance_snapshot is boolean",
      typeof snapshot.is_compliance_snapshot === "boolean",
      true,
    );
  }
  if (snapshot.is_in_promotion !== undefined) {
    TestValidator.equals(
      "is_in_promotion is boolean",
      typeof snapshot.is_in_promotion === "boolean",
      true,
    );
  }
  if (snapshot.is_featured_in_category !== undefined) {
    TestValidator.equals(
      "is_featured_in_category is boolean",
      typeof snapshot.is_featured_in_category === "boolean",
      true,
    );
  }
  if (snapshot.is_featured_on_homepage !== undefined) {
    TestValidator.equals(
      "is_featured_on_homepage is boolean",
      typeof snapshot.is_featured_on_homepage === "boolean",
      true,
    );
  }
  if (snapshot.is_best_seller_in_category !== undefined) {
    TestValidator.equals(
      "is_best_seller_in_category is boolean",
      typeof snapshot.is_best_seller_in_category === "boolean",
      true,
    );
  }
  if (snapshot.is_new_arrival !== undefined) {
    TestValidator.equals(
      "is_new_arrival is boolean",
      typeof snapshot.is_new_arrival === "boolean",
      true,
    );
  }
  if (snapshot.is_trending !== undefined) {
    TestValidator.equals(
      "is_trending is boolean",
      typeof snapshot.is_trending === "boolean",
      true,
    );
  }
  // Validate string length and format
  TestValidator.predicate("name is not empty", () => snapshot.name.length > 0);
  TestValidator.predicate(
    "description is not empty",
    () => snapshot.description.length > 0,
  );
  TestValidator.predicate("sku is not empty", () => snapshot.sku.length > 0);
  TestValidator.predicate(
    "manufacturer is not empty",
    () => snapshot.manufacturer.length > 0,
  );
  // Validate change summary
  if (snapshot.change_summary) {
    TestValidator.predicate(
      "change_summary is not empty",
      () => snapshot.change_summary.length > 0,
    );
  }
  // Validate null/undefined fields that can be null
  if (snapshot.brand_id !== null && snapshot.brand_id !== undefined) {
    const brandId = typia.assert<string>(snapshot.brand_id!);
    TestValidator.predicate("brand_id is UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        brandId,
      ),
    );
  }
  if (snapshot.created_by !== null && snapshot.created_by !== undefined) {
    const createdBy = typia.assert<string>(snapshot.created_by!);
    TestValidator.predicate("created_by is UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        createdBy,
      ),
    );
  }
  if (snapshot.modified_by !== null && snapshot.modified_by !== undefined) {
    const modifiedBy = typia.assert<string>(snapshot.modified_by!);
    TestValidator.predicate("modified_by is UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        modifiedBy,
      ),
    );
  }
  if (snapshot.deleted_by !== null && snapshot.deleted_by !== undefined) {
    const deletedBy = typia.assert<string>(snapshot.deleted_by!);
    TestValidator.predicate("deleted_by is UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        deletedBy,
      ),
    );
  }
  if (
    snapshot.external_ref_id !== null &&
    snapshot.external_ref_id !== undefined
  ) {
    const externalRefId = typia.assert<string>(snapshot.external_ref_id!);
    TestValidator.predicate("external_ref_id is UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        externalRefId,
      ),
    );
  }
}

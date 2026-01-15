import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotAttributeValues } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotAttributeValues";
import type { IShoppingMallProductSnapshotChangeDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotChangeDetails";
import type { IShoppingMallProductSnapshotVariantAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantAttributes";
import type { IShoppingMallProductSnapshotVariantAvailability } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantAvailability";
import type { IShoppingMallProductSnapshotVariantImages } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantImages";
import type { IShoppingMallProductSnapshotVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantInventory";
import type { IShoppingMallProductSnapshotVariantPrices } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantPrices";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Use a random valid UUID for product ID since we can't create products
  // The endpoint must handle any valid UUID, so we test with a randomly generated one
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve product snapshot history with various filters
  // Test: Retrieve all snapshots (base case) - this validates the endpoint structure
  const allSnapshots: IPageIShoppingMallProductSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: productId,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    allSnapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allSnapshots.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    () => allSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    () => allSnapshots.pagination.pages >= 0,
  );
  // Validate data array contains snapshots
  TestValidator.predicate("data array exists", () =>
    Array.isArray(allSnapshots.data),
  );
  // Test: Filter by date range with sample values
  // Using ISO date-time format as specified in schema
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const dateRangeSnapshots: IPageIShoppingMallProductSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: productId,
        body: {
          startDate: startDate,
          endDate: endDate,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshots);
  // Test: Filter by change_type with 'edit' value
  const editSnapshots: IPageIShoppingMallProductSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: productId,
        body: {
          changeType: "update", // Changed from "edit" to "update" per schema enum
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(editSnapshots);
  // Test: Filter by affectedFields with valid values
  const affectedFieldsSnapshots: IPageIShoppingMallProductSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: productId,
        body: {
          affectedFields: ["name", "description", "price"],
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(affectedFieldsSnapshots);
  // Test: Pagination with limit=1 and page=1
  const limitedSnapshots: IPageIShoppingMallProductSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: productId,
        body: {
          limit: 1,
          page: 1,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(limitedSnapshots);
  TestValidator.equals(
    "limited snapshots length",
    limitedSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "limited pagination limit",
    limitedSnapshots.pagination.limit,
    1,
  );
  // Test: Pagination with page=2 and limit=1
  const secondPageSnapshots: IPageIShoppingMallProductSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: productId,
        body: {
          limit: 1,
          page: 2,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(secondPageSnapshots);
  // Test: Retrieve snapshot data structure validation
  if (allSnapshots.data.length > 0) {
    const snapshot = allSnapshots.data[0];
    TestValidator.equals("snapshot product_id", snapshot.product_id, productId);
    TestValidator.predicate(
      "snapshot has version_number",
      () =>
        typeof snapshot.version_number === "number" &&
        snapshot.version_number >= 1,
    );
    TestValidator.predicate(
      "snapshot has snapshot_source",
      () =>
        snapshot.snapshot_source === "manual" ||
        snapshot.snapshot_source === "automatic",
    );
    TestValidator.predicate(
      "snapshot has name",
      () => typeof snapshot.name === "string",
    );
    TestValidator.predicate(
      "snapshot has description",
      () => typeof snapshot.description === "string",
    );
    TestValidator.predicate(
      "snapshot has status",
      () =>
        snapshot.status === "active" ||
        snapshot.status === "inactive" ||
        snapshot.status === "archived",
    );
    TestValidator.predicate(
      "snapshot has category_id",
      () =>
        typeof snapshot.category_id === "string" &&
        snapshot.category_id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has brand_id or is null",
      () => snapshot.brand_id === null || typeof snapshot.brand_id === "string",
    );
    TestValidator.predicate(
      "snapshot has manufacturer",
      () => typeof snapshot.manufacturer === "string",
    );
    TestValidator.predicate(
      "snapshot has sku",
      () => typeof snapshot.sku === "string" && snapshot.sku.length > 0,
    );
    TestValidator.predicate(
      "snapshot has is_published",
      () => typeof snapshot.is_published === "boolean",
    );
    TestValidator.predicate(
      "snapshot has price",
      () => typeof snapshot.price === "number" && snapshot.price >= 0,
    );
    TestValidator.predicate(
      "snapshot has currency",
      () => typeof snapshot.currency === "string",
    );
    TestValidator.predicate(
      "snapshot has has_variants",
      () => typeof snapshot.has_variants === "boolean",
    );
    TestValidator.predicate(
      "snapshot has is_featured",
      () => typeof snapshot.is_featured === "boolean",
    );
    TestValidator.predicate(
      "snapshot has is_new",
      () => typeof snapshot.is_new === "boolean",
    );
    TestValidator.predicate(
      "snapshot has is_best_seller",
      () => typeof snapshot.is_best_seller === "boolean",
    );
    TestValidator.predicate("snapshot has tag_ids", () =>
      Array.isArray(snapshot.tag_ids),
    );
    TestValidator.predicate(
      "snapshot has variant_count",
      () =>
        typeof snapshot.variant_count === "number" &&
        snapshot.variant_count >= 0,
    );
    TestValidator.predicate(
      "snapshot has inventory_count",
      () =>
        typeof snapshot.inventory_count === "number" &&
        snapshot.inventory_count >= 0,
    );
    TestValidator.predicate(
      "snapshot has is_in_stock",
      () => typeof snapshot.is_in_stock === "boolean",
    );
    TestValidator.predicate(
      "snapshot has availability_status",
      () =>
        snapshot.availability_status === "in_stock" ||
        snapshot.availability_status === "low_stock" ||
        snapshot.availability_status === "out_of_stock" ||
        snapshot.availability_status === "backorder",
    );
    TestValidator.predicate(
      "snapshot has is_active",
      () => typeof snapshot.is_active === "boolean",
    );
    TestValidator.predicate(
      "snapshot has weight_grams",
      () =>
        typeof snapshot.weight_grams === "number" && snapshot.weight_grams >= 0,
    );
    TestValidator.predicate(
      "snapshot has length_cm",
      () => typeof snapshot.length_cm === "number" && snapshot.length_cm >= 0,
    );
    TestValidator.predicate(
      "snapshot has width_cm",
      () => typeof snapshot.width_cm === "number" && snapshot.width_cm >= 0,
    );
    TestValidator.predicate(
      "snapshot has height_cm",
      () => typeof snapshot.height_cm === "number" && snapshot.height_cm >= 0,
    );
    TestValidator.predicate("snapshot has images_url", () =>
      Array.isArray(snapshot.images_url),
    );
    TestValidator.predicate(
      "snapshot has meta_title",
      () => typeof snapshot.meta_title === "string",
    );
    TestValidator.predicate(
      "snapshot has meta_description",
      () => typeof snapshot.meta_description === "string",
    );
    TestValidator.predicate(
      "snapshot has canonical_url",
      () =>
        typeof snapshot.canonical_url === "string" &&
        snapshot.canonical_url.length > 0,
    );
    TestValidator.predicate("snapshot has seo_keywords", () =>
      Array.isArray(snapshot.seo_keywords),
    );
    TestValidator.predicate(
      "snapshot has created_by or is null",
      () =>
        snapshot.created_by === null || typeof snapshot.created_by === "string",
    );
    TestValidator.predicate(
      "snapshot has modified_by or is null",
      () =>
        snapshot.modified_by === null ||
        typeof snapshot.modified_by === "string",
    );
    TestValidator.predicate(
      "snapshot has change_summary",
      () => typeof snapshot.change_summary === "string",
    );
    TestValidator.predicate(
      "snapshot has change_type",
      () =>
        snapshot.change_type === "initial" ||
        snapshot.change_type === "edit" ||
        snapshot.change_type === "revert" ||
        snapshot.change_type === "bulk_update" ||
        snapshot.change_type === "migration",
    );
    TestValidator.predicate(
      "snapshot has deleted_by or is null",
      () =>
        snapshot.deleted_by === null || typeof snapshot.deleted_by === "string",
    );
    TestValidator.predicate(
      "snapshot has is_deleted_by_admin",
      () => typeof snapshot.is_deleted_by_admin === "boolean",
    );
    TestValidator.predicate(
      "snapshot has deleted_reason or is null",
      () =>
        snapshot.deleted_reason === null ||
        typeof snapshot.deleted_reason === "string",
    );
    TestValidator.predicate(
      "snapshot has is_archived or is undefined",
      () =>
        snapshot.is_archived === undefined ||
        typeof snapshot.is_archived === "boolean",
    );
    TestValidator.predicate(
      "snapshot has is_compliance_snapshot or is undefined",
      () =>
        snapshot.is_compliance_snapshot === undefined ||
        typeof snapshot.is_compliance_snapshot === "boolean",
    );
    TestValidator.predicate(
      "snapshot has snapshot_expiry_utc or is null",
      () =>
        snapshot.snapshot_expiry_utc === null ||
        typeof snapshot.snapshot_expiry_utc === "string",
    );
    TestValidator.predicate(
      "snapshot has source_system or is null",
      () =>
        snapshot.source_system === null ||
        typeof snapshot.source_system === "string",
    );
    TestValidator.predicate(
      "snapshot has data_source",
      () =>
        snapshot.data_source === "product" ||
        snapshot.data_source === "variant" ||
        snapshot.data_source === "bulk" ||
        snapshot.data_source === "import",
    );
    TestValidator.predicate(
      "snapshot has external_ref_id or is null",
      () =>
        snapshot.external_ref_id === null ||
        typeof snapshot.external_ref_id === "string",
    );
    TestValidator.predicate(
      "snapshot has review_count or is undefined",
      () =>
        snapshot.review_count === undefined ||
        (typeof snapshot.review_count === "number" &&
          snapshot.review_count >= 0),
    );
    TestValidator.predicate(
      "snapshot has average_rating or is undefined",
      () =>
        snapshot.average_rating === undefined ||
        (typeof snapshot.average_rating === "number" &&
          snapshot.average_rating >= 0 &&
          snapshot.average_rating <= 5),
    );
    TestValidator.predicate(
      "snapshot has order_count or is undefined",
      () =>
        snapshot.order_count === undefined ||
        (typeof snapshot.order_count === "number" && snapshot.order_count >= 0),
    );
    TestValidator.predicate(
      "snapshot has total_revenue or is undefined",
      () =>
        snapshot.total_revenue === undefined ||
        (typeof snapshot.total_revenue === "number" &&
          snapshot.total_revenue >= 0),
    );
    TestValidator.predicate(
      "snapshot has search_score or is undefined",
      () =>
        snapshot.search_score === undefined ||
        (typeof snapshot.search_score === "number" &&
          snapshot.search_score >= 0),
    );
    TestValidator.predicate(
      "snapshot has search_keywords or is undefined",
      () =>
        snapshot.search_keywords === undefined ||
        Array.isArray(snapshot.search_keywords),
    );
    TestValidator.predicate(
      "snapshot has visibility_score or is undefined",
      () =>
        snapshot.visibility_score === undefined ||
        (typeof snapshot.visibility_score === "number" &&
          snapshot.visibility_score >= 0),
    );
    TestValidator.predicate(
      "snapshot has is_in_promotion or is undefined",
      () =>
        snapshot.is_in_promotion === undefined ||
        typeof snapshot.is_in_promotion === "boolean",
    );
    TestValidator.predicate(
      "snapshot has promotion_name or is null",
      () =>
        snapshot.promotion_name === null ||
        typeof snapshot.promotion_name === "string",
    );
    TestValidator.predicate(
      "snapshot has promotion_discount_percentage or is null",
      () =>
        snapshot.promotion_discount_percentage === null ||
        (typeof snapshot.promotion_discount_percentage === "number" &&
          snapshot.promotion_discount_percentage >= 0 &&
          snapshot.promotion_discount_percentage <= 100),
    );
    TestValidator.predicate(
      "snapshot has promotion_end_date or is null",
      () =>
        snapshot.promotion_end_date === null ||
        typeof snapshot.promotion_end_date === "string",
    );
    TestValidator.predicate(
      "snapshot has is_featured_in_category or is undefined",
      () =>
        snapshot.is_featured_in_category === undefined ||
        typeof snapshot.is_featured_in_category === "boolean",
    );
    TestValidator.predicate(
      "snapshot has is_featured_on_homepage or is undefined",
      () =>
        snapshot.is_featured_on_homepage === undefined ||
        typeof snapshot.is_featured_on_homepage === "boolean",
    );
    TestValidator.predicate(
      "snapshot has is_best_seller_in_category or is undefined",
      () =>
        snapshot.is_best_seller_in_category === undefined ||
        typeof snapshot.is_best_seller_in_category === "boolean",
    );
    TestValidator.predicate(
      "snapshot has is_new_arrival or is undefined",
      () =>
        snapshot.is_new_arrival === undefined ||
        typeof snapshot.is_new_arrival === "boolean",
    );
    TestValidator.predicate(
      "snapshot has is_trending or is undefined",
      () =>
        snapshot.is_trending === undefined ||
        typeof snapshot.is_trending === "boolean",
    );
    TestValidator.predicate(
      "snapshot has product_attribute_values or is undefined",
      () =>
        snapshot.product_attribute_values === undefined ||
        typeof snapshot.product_attribute_values === "string",
    );
    TestValidator.predicate(
      "snapshot has variant_prices or is undefined",
      () =>
        snapshot.variant_prices === undefined ||
        typeof snapshot.variant_prices === "string",
    );
    TestValidator.predicate(
      "snapshot has variant_inventory or is undefined",
      () =>
        snapshot.variant_inventory === undefined ||
        typeof snapshot.variant_inventory === "string",
    );
    TestValidator.predicate(
      "snapshot has variant_attributes or is undefined",
      () =>
        snapshot.variant_attributes === undefined ||
        typeof snapshot.variant_attributes === "string",
    );
    TestValidator.predicate(
      "snapshot has variant_images or is undefined",
      () =>
        snapshot.variant_images === undefined ||
        typeof snapshot.variant_images === "string",
    );
    TestValidator.predicate(
      "snapshot has variant_availability or is undefined",
      () =>
        snapshot.variant_availability === undefined ||
        typeof snapshot.variant_availability === "string",
    );
    // Validate change_details is a valid JSON string
    if (snapshot.change_details != null) {
      // This is a string based on the schema definition IShoppingMallProductSnapshotChangeDetails = string
      TestValidator.predicate("change_details is a valid JSON string", () => {
        try {
          JSON.parse(snapshot.change_details ?? "{}"); // Added nullish coalescing to handle undefined
          return true;
        } catch {
          return false;
        }
      });
    }
  }
  // Test: Attempt access with invalid productId format
  await TestValidator.error("invalid product ID should fail", async () => {
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: "invalid-uuid-format", // Not a valid UUID
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  });
  // Test: Attempt access with empty body
  // Should work as all body fields are optional
  const emptyBodySnapshots: IPageIShoppingMallProductSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: productId,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(emptyBodySnapshots);
  // Test: Test with pagination limit at maximum (100)
  const maxLimitSnapshots: IPageIShoppingMallProductSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: productId,
        body: {
          limit: 100,
          page: 1,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitSnapshots);
  // Test: Test with pagination limit at minimum (1)
  const minLimitSnapshots: IPageIShoppingMallProductSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: productId,
        body: {
          limit: 1,
          page: 1,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(minLimitSnapshots);
  // Test: Test with pagination page=1 (minimum)
  const minPageSnapshots: IPageIShoppingMallProductSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: productId,
        body: {
          limit: 20,
          page: 1,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(minPageSnapshots);
}
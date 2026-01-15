import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryBatches } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryBatches";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryBatches } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryBatches";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_batches_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthResult);
  // Step 2: Retrieve inventory batches with minimal valid filter (must use only provided API)
  // We'll use existing required properties from IRequest: batch_number, product_id, warehouse_location,
  // batch_status, min_quantity, max_quantity, min_expiration_date, max_expiration_date,
  // created_after, created_before
  const inventoryBatches =
    await api.functional.communityPlatform.inventory_batches.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          batch_number: "BATCH-001", // Required field from IRequest
          product_id: typia.random<string & tags.Format<"uuid">>(), // Required field from IRequest
          warehouse_location: "WAREHOUSE-001", // Required field from IRequest
          batch_status: "active", // Required field from IRequest
          min_quantity: 0, // Required field from IRequest
          max_quantity: 100, // Required field from IRequest
          min_expiration_date: new Date(Date.now() + 86400000)
            .toISOString()
            .split("T")[0], // Required field: ISO 8601 date
          max_expiration_date: new Date(Date.now() + 86400000 * 30)
            .toISOString()
            .split("T")[0], // Required field: ISO 8601 date
          created_after: new Date(Date.now() - 86400000).toISOString(), // Required field: ISO 8601 date-time
          created_before: new Date().toISOString(), // Required field: ISO 8601 date-time
          metadata_key: "location", // Added required metadata_key property
          metadata_value: "warehouse-a", // Added required metadata_value property
        } satisfies ICommunityPlatformInventoryBatches.IRequest,
      },
    );
  typia.assert(inventoryBatches);
  // Step 3: Validate response structure
  TestValidator.equals(
    "pagination limit matches",
    inventoryBatches.pagination.limit,
    10,
  );
  TestValidator.equals(
    "current page is 1",
    inventoryBatches.pagination.current,
    1,
  );
  TestValidator.predicate("data is an array", () =>
    Array.isArray(inventoryBatches.data),
  );
  TestValidator.predicate(
    "data contains items",
    () => inventoryBatches.data.length > 0,
  );
  // Validate each batch summary has correct structure
  TestValidator.predicate("all data items have required properties", () => {
    return inventoryBatches.data.every(
      (batch) =>
        batch.id !== undefined &&
        batch.batch_number !== undefined &&
        batch.product_id !== undefined &&
        batch.warehouse_location !== undefined &&
        batch.batch_status !== undefined &&
        batch.quantity !== undefined &&
        batch.created_at !== undefined &&
        batch.product_name !== undefined &&
        batch.category_name !== undefined &&
        batch.supplier_name !== undefined,
    );
  });
  // Test sorting (simple case) - using existing properties
  const sortedByBatchNumber =
    await api.functional.communityPlatform.inventory_batches.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort_by: "batch_number",
          order: "asc",
          batch_number: "BATCH-001", // Required field from IRequest
          product_id: typia.random<string & tags.Format<"uuid">>(), // Required field from IRequest
          warehouse_location: "WAREHOUSE-001", // Required field from IRequest
          batch_status: "active", // Required field from IRequest
          min_quantity: 0, // Required field from IRequest
          max_quantity: 100, // Required field from IRequest
          min_expiration_date: new Date(Date.now() + 86400000)
            .toISOString()
            .split("T")[0], // Required field
          max_expiration_date: new Date(Date.now() + 86400000 * 30)
            .toISOString()
            .split("T")[0], // Required field
          created_after: new Date(Date.now() - 86400000).toISOString(), // Required field
          created_before: new Date().toISOString(), // Required field
          metadata_key: "location", // Added required metadata_key property
          metadata_value: "warehouse-a", // Added required metadata_value property
        } satisfies ICommunityPlatformInventoryBatches.IRequest,
      },
    );
  typia.assert(sortedByBatchNumber);
  // Verify we got results and pagination
  TestValidator.equals(
    "sorted by batch_number: limit",
    sortedByBatchNumber.pagination.limit,
    5,
  );
  TestValidator.equals(
    "sorted by batch_number: current",
    sortedByBatchNumber.pagination.current,
    1,
  );
}

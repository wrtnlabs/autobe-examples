import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventoryAdjustments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryAdjustments";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryAdjustments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryAdjustments";
export async function test_api_inventory_anomaly_detection_standard(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection for making the API call
  // According to the connection isolation pattern, every actor needs their own connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Call the anomaly detection endpoint
  // This endpoint returns IPageICommunityPlatformInventoryAdjustments
  const response: IPageICommunityPlatformInventoryAdjustments =
    await api.functional.communityPlatform.inventory.adjustments.anomalies.index(
      adminConnection,
    );
  // Validate the response structure matches the expected type
  typia.assert(response);
  // Validate pagination metadata - all required properties must be present and correct type
  TestValidator.equals(
    "pagination current page is a positive integer",
    response.pagination.current,
    response.pagination.current,
  );
  TestValidator.predicate(
    "pagination current page is >= 0",
    () => response.pagination.current >= 0,
  );
  TestValidator.equals(
    "pagination limit is a positive integer",
    response.pagination.limit,
    response.pagination.limit,
  );
  TestValidator.predicate(
    "pagination limit is >= 0",
    () => response.pagination.limit >= 0,
  );
  TestValidator.equals(
    "pagination records is a positive integer",
    response.pagination.records,
    response.pagination.records,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    () => response.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages is a positive integer",
    response.pagination.pages,
    response.pagination.pages,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    () => response.pagination.pages >= 0,
  );
  // Validate that data is an array
  TestValidator.predicate("data is an array", () =>
    Array.isArray(response.data),
  );
  // Validate that each item in data array has the correct ICommunityPlatformInventoryAdjustments structure
  response.data.forEach((item) => {
    // Ensure all required properties exist
    TestValidator.predicate(
      "item has productId",
      () => typeof item.productId === "string",
    );
    TestValidator.predicate(
      "item has warehouseId",
      () => typeof item.warehouseId === "string",
    );
    TestValidator.predicate(
      "item has adjustmentAmount",
      () => typeof item.adjustmentAmount === "number",
    );
    TestValidator.predicate(
      "item has reason",
      () => typeof item.reason === "string",
    );
    // Validate property types according to the DTO definition
    TestValidator.predicate("productId is a UUID format", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.productId,
      ),
    );
    TestValidator.predicate("warehouseId is a UUID format", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.warehouseId,
      ),
    );
    // Verify adjustmentAmount is an integer (int32)
    TestValidator.predicate("adjustmentAmount is an integer", () =>
      Number.isInteger(item.adjustmentAmount),
    );
    // Verify reason is a non-empty string
    TestValidator.predicate(
      "reason is a non-empty string",
      () => item.reason.length > 0,
    );
  });
}

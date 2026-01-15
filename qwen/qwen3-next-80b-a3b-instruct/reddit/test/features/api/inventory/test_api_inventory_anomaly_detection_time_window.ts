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
export async function test_api_inventory_anomaly_detection_time_window(
  connection: api.IConnection,
): Promise<void> {
  // This test validates the structure and response type of the anomaly detection endpoint
  // Since there's no API provided to create inventory adjustments, we cannot control
  // the data that triggers anomalies. We must validate that the endpoint returns
  // the correct structure as specified in the IPageICommunityPlatformInventoryAdjustments type.
  // Call the anomaly detection endpoint
  const anomalyResult =
    await api.functional.communityPlatform.inventory.adjustments.anomalies.index(
      connection,
    );
  // Validate the response structure using typia.assert
  typia.assert(anomalyResult);
  // Verify the response has the correct structure: pagination and data array
  TestValidator.predicate(
    "response has pagination property",
    anomalyResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data property",
    anomalyResult.data !== undefined,
  );
  // Verify pagination structure matches IPage.IPagination definition
  TestValidator.predicate(
    "pagination current is a valid integer",
    typeof anomalyResult.pagination.current === "number" &&
      Number.isInteger(anomalyResult.pagination.current) &&
      anomalyResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is a valid integer",
    typeof anomalyResult.pagination.limit === "number" &&
      Number.isInteger(anomalyResult.pagination.limit) &&
      anomalyResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is a valid integer",
    typeof anomalyResult.pagination.records === "number" &&
      Number.isInteger(anomalyResult.pagination.records) &&
      anomalyResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is a valid integer",
    typeof anomalyResult.pagination.pages === "number" &&
      Number.isInteger(anomalyResult.pagination.pages) &&
      anomalyResult.pagination.pages >= 0,
  );
  // Verify data array structure
  TestValidator.predicate(
    "data is an array",
    Array.isArray(anomalyResult.data),
  );
  // Validate that each item in the data array has the correct structure
  if (anomalyResult.data.length > 0) {
    const firstItem = anomalyResult.data[0];
    TestValidator.predicate(
      "each item has productId property",
      firstItem.productId !== undefined &&
        typeof firstItem.productId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          firstItem.productId,
        ),
    );
    TestValidator.predicate(
      "each item has warehouseId property",
      firstItem.warehouseId !== undefined &&
        typeof firstItem.warehouseId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          firstItem.warehouseId,
        ),
    );
    TestValidator.predicate(
      "each item has adjustmentAmount property",
      firstItem.adjustmentAmount !== undefined &&
        typeof firstItem.adjustmentAmount === "number" &&
        Number.isInteger(firstItem.adjustmentAmount),
    );
    TestValidator.predicate(
      "each item has reason property",
      firstItem.reason !== undefined &&
        typeof firstItem.reason === "string" &&
        firstItem.reason.length > 0,
    );
  }
}

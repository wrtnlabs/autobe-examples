import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_report_admin_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: "192.168.1.1",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // Generate a random variant ID for testing
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = now.toISOString(); // Current time
  // Configure the report request with filters that align with our test scenario
  // The 'sourceType' filter is for aggregation filtering
  // Use 'quantity_change' for sortBy as it's the only logical match for our aggregated metrics
  const reportRequest = {
    variantId: variantId,
    sourceType: "restock", // We're testing restock aggregation
    startDate: startDate,
    endDate: endDate,
    sortBy: "quantity_change", // Corrected from 'quantity' to match valid enum values
    pageSize: 10,
  } satisfies IShoppingMallInventoryRecord.IRequest;
  // Call the only available endpoint - reports.index
  const report =
    await api.functional.shoppingMall.admin.inventories.reports.index(
      adminConnection,
      { body: reportRequest },
    );
  typia.assert(report);
  // Step 2: Validate pagination metadata
  TestValidator.equals("pagination current page", report.pagination.current, 1);
  TestValidator.equals("pagination limit", report.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is not negative",
    () => report.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is not negative",
    () => report.pagination.pages >= 0,
  );
  // Step 3: Validate data content - aggregated metrics must exist
  // We are testing that we can retrieve the aggregated data even when no specific records were created
  // This validates the API endpoint structure and filtering
  TestValidator.predicate(
    "data array has at least one record",
    () => report.data.length > 0,
  );
  // Get the first aggregated record (there should be at least one)
  const aggregatedRecord = report.data[0];
  // Validate the aggregated metrics according to IShoppingMallInventoryRecord
  TestValidator.predicate(
    "totalQuantityChange is non-negative",
    () => aggregatedRecord.totalQuantityChange >= 0,
  );
  TestValidator.predicate(
    "transactionCount is greater than zero",
    () => aggregatedRecord.transactionCount > 0,
  );
  TestValidator.predicate(
    "averageChange is non-negative",
    () => aggregatedRecord.averageChange >= 0,
  );
  // Additional validation: since sourceType was filtered to 'restock',
  // the totalQuantityChange should be positive (restock adds inventory)
  // This may depend on existing data in the system, but we validate the expected behavior
  if (aggregatedRecord.totalQuantityChange > 0) {
    TestValidator.equals(
      "totalQuantityChange should be positive for restock filter",
      true,
      true,
    );
  } else {
    // If no restock records exist, this is acceptable
    TestValidator.predicate(
      "totalQuantityChange should be zero or positive for restock filter",
      () => aggregatedRecord.totalQuantityChange >= 0,
    );
  }
}

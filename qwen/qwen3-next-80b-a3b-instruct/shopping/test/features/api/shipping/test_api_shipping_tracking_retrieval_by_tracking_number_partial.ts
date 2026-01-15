import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingTracking";
import type { IShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingTracking";
export async function test_api_shipping_tracking_retrieval_by_tracking_number_partial(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection to generate test data
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate random tracking number fragments for test data
  const trackingPrefixes = [
    "DHL-100",
    "DHL-200",
    "DHL-300",
    "FedEx-100",
    "UPS-100",
    "dhl-400", // lowercase variant - should not match DHL-123
    "DHL-500",
    "DHL-600",
    "DHL-ABC",
  ];
  // Create an array of shipping tracking records with different tracking numbers
  const trackingRecords = await ArrayUtil.asyncRepeat(
    trackingPrefixes.length,
    async (index) => {
      const trackingNumber = trackingPrefixes[index];
      const carrier = trackingNumber.startsWith("DHL-")
        ? "DHL"
        : trackingNumber.startsWith("FedEx-")
          ? "FedEx"
          : "UPS";
      const trackingData = {
        id: typia.random<string & tags.Format<"uuid">>(),
        order_id: typia.random<string & tags.Format<"uuid">>(),
        tracking_number: trackingNumber,
        carrier,
        status: "in_transit",
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        carrier_tracking_url: `https://tracking.example.com/${trackingNumber}`,
      } satisfies IShoppingMallShippingTracking.ISummary;
      return trackingData;
    },
  );
  // Use one of the created tracking numbers as our search term - partial match on DHL-100
  const searchTerm = "DHL-100";
  // Create the search request with partial tracking number
  const searchRequest = {
    page: 1,
    limit: 10,
    trackingNumber: searchTerm, // Partial match search
  } satisfies IShoppingMallShippingTracking.IRequest;
  // Execute the search
  const searchResult =
    await api.functional.shoppingMall.shipping_trackings._patch(connection, {
      body: searchRequest,
    });
  // Validate the response structure
  typia.assert(searchResult);
  // Verify we have results
  TestValidator.equals(
    "search should return results",
    searchResult.data.length > 0,
    true,
  );
  // Verify pagination metadata
  TestValidator.equals(
    "pagination page matches request",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchResult.pagination.limit,
    10,
  );
  // Verify the search result contains only records with the exact partial match
  const matchedRecords = searchResult.data.filter((record) =>
    record.tracking_number.includes(searchTerm),
  );
  // All returned records must contain the partial tracking number
  TestValidator.equals(
    "all returned records contain the search term",
    searchResult.data.length,
    matchedRecords.length,
  );
  // Verify case-sensitive matching - only uppercase "DHL-" should match
  const lowerCaseMatched = searchResult.data.some(
    (record) => record.tracking_number === "dhl-400",
  );
  TestValidator.equals(
    "lowercase tracking number should NOT match uppercase search term",
    lowerCaseMatched,
    false,
  );
  // Verify that exact tracking numbers containing the search term are returned
  const shouldMatch = ["DHL-100", "DHL-100-A", "DHL-100B", "DHL-100-123"];
  // Verify specific records that contain the search term
  for (const expectedTrackingNumber of shouldMatch) {
    const matches = searchResult.data.filter(
      (r) => r.tracking_number === expectedTrackingNumber,
    );
    TestValidator.equals(
      `tracking number ${expectedTrackingNumber} should be in results`,
      matches.length > 0,
      true,
    );
  }
  // Verify that records that don't match the search term are excluded
  const shouldNotMatch = ["DHL-200", "FedEx-100", "UPS-100", "dhl-400"];
  // Verify records that should NOT match are excluded
  for (const nonMatchTrackingNumber of shouldNotMatch) {
    const matches = searchResult.data.filter(
      (r) => r.tracking_number === nonMatchTrackingNumber,
    );
    TestValidator.equals(
      `tracking number ${nonMatchTrackingNumber} should NOT be in results`,
      matches.length > 0,
      false,
    );
  }
}
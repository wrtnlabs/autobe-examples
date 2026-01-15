import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformShipmentStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentStatusBreakdown";
import type { ICommunityPlatformShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentTracking";
export async function test_api_shipment_status_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Call the public analytics endpoint
  const analytics: ICommunityPlatformShipmentTracking =
    await api.functional.communityPlatform.analytics.shipments.status.index(
      connection,
    );
  // Complete type validation using typia.assert
  typia.assert(analytics);
  // Validate total_shipments equals sum of all status counts
  const total =
    analytics.pending_count +
    analytics.in_transit_count +
    analytics.delivered_count +
    analytics.failed_count +
    analytics.cancelled_count;
  TestValidator.equals(
    "total shipments sum matches",
    analytics.total_shipments,
    total,
  );
  // Confirm total_shipments is positive
  TestValidator.predicate(
    "total shipments is positive",
    analytics.total_shipments > 0,
  );
  // Validate percentages match calculated values from counts (within 0.1% error tolerance)
  // This approach is more accurate than just summing percentages (which could be artificially balanced)
  const percentages = [
    analytics.pending_percentage,
    analytics.in_transit_percentage,
    analytics.delivered_percentage,
    analytics.failed_percentage,
    analytics.cancelled_percentage,
  ];
  // Calculate expected percentages from actual counts
  const expectedPercentages = [
    analytics.pending_count > 0 ? (analytics.pending_count / total) * 100 : 0,
    analytics.in_transit_count > 0
      ? (analytics.in_transit_count / total) * 100
      : 0,
    analytics.delivered_count > 0
      ? (analytics.delivered_count / total) * 100
      : 0,
    analytics.failed_count > 0 ? (analytics.failed_count / total) * 100 : 0,
    analytics.cancelled_count > 0
      ? (analytics.cancelled_count / total) * 100
      : 0,
  ];
  // Validate each percentage matches calculated value within tolerance
  for (let i = 0; i < percentages.length; i++) {
    const expected = expectedPercentages[i];
    const actual = percentages[i];
    const tolerance = 0.1; // 0.1% error tolerance for floating point calculations
    TestValidator.predicate(
      `percentage ${i} matches calculated value`,
      Math.abs(actual - expected) <= tolerance,
    );
  }
  // Validate average_duration_hours is a finite non-negative number
  TestValidator.predicate(
    "average duration is finite",
    Number.isFinite(analytics.average_duration_hours),
  );
  TestValidator.predicate(
    "average duration is non-negative",
    analytics.average_duration_hours >= 0,
  );
  // Verify status_breakdown is a non-empty string as per DTO definition
  TestValidator.predicate(
    "status_breakdown is a non-empty string",
    typeof analytics.status_breakdown === "string" &&
      analytics.status_breakdown.length > 0,
  );
}

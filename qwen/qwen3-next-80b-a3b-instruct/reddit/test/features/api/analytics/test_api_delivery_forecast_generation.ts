import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCarrierPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCarrierPerformance";
import type { ICommunityPlatformDeliveryWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeliveryWindow";
import type { ICommunityPlatformRegionPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRegionPerformance";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_delivery_forecast_generation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Retrieve delivery forecast data
  const forecast: ICommunityPlatformDeliveryWindow =
    await api.functional.communityPlatform.admin.analytics.shipments.delivery_forecast.index(
      adminConnection,
    );
  // Step 3: Validate forecast data structure and content
  typia.assert(forecast);
  // Verify all required fields have non-null, valid values
  TestValidator.predicate(
    "total_shipments must be non-negative",
    forecast.total_shipments >= 0,
  );
  TestValidator.predicate(
    "completed_shipments must be non-negative",
    forecast.completed_shipments >= 0,
  );
  TestValidator.predicate(
    "in_transit_shipments must be non-negative",
    forecast.in_transit_shipments >= 0,
  );
  TestValidator.predicate(
    "delayed_shipments must be non-negative",
    forecast.delayed_shipments >= 0,
  );
  TestValidator.predicate(
    "on_time_delivery_rate must be between 0 and 1",
    forecast.on_time_delivery_rate >= 0 && forecast.on_time_delivery_rate <= 1,
  );
  TestValidator.predicate(
    "average_delivery_time_hours must be non-negative",
    forecast.average_delivery_time_hours >= 0,
  );
  TestValidator.predicate(
    "delivery_time_std_dev_hours must be non-negative",
    forecast.delivery_time_std_dev_hours >= 0,
  );
  TestValidator.predicate(
    "confidence_level must be between 0 and 1",
    forecast.confidence_level >= 0 && forecast.confidence_level <= 1,
  );
  // Validate region_performance is a string (as specified in schema)
  TestValidator.predicate(
    "region_performance must be a non-empty string",
    typeof forecast.region_performance === "string" &&
      forecast.region_performance.length > 0,
  );
  // Validate carrier_performance is a non-null object with string keys and number values between 0 and 1
  TestValidator.predicate(
    "carrier_performance must be a non-null object",
    typeof forecast.carrier_performance === "object" &&
      forecast.carrier_performance !== null,
  );
  // Ensure carrier_performance has at least one entry (realistic scenario)
  const carrierKeys = Object.keys(forecast.carrier_performance);
  TestValidator.predicate(
    "carrier_performance must have at least one carrier",
    carrierKeys.length >= 1,
  );
  // Verify all carrier performance values are between 0 and 1
  for (const carrier of carrierKeys) {
    TestValidator.predicate(
      `carrier ${carrier} on-time rate is between 0 and 1`,
      forecast.carrier_performance[carrier] >= 0 &&
        forecast.carrier_performance[carrier] <= 1,
    );
  }
  // Validate date-time format strings are non-empty (typia.assert already validates format)
  TestValidator.predicate(
    "predicted_delivery_date must be a non-empty string",
    typeof forecast.predicted_delivery_date === "string" &&
      forecast.predicted_delivery_date.length > 0,
  );
  TestValidator.predicate(
    "predicted_delivery_window_start must be a non-empty string",
    typeof forecast.predicted_delivery_window_start === "string" &&
      forecast.predicted_delivery_window_start.length > 0,
  );
  TestValidator.predicate(
    "predicted_delivery_window_end must be a non-empty string",
    typeof forecast.predicted_delivery_window_end === "string" &&
      forecast.predicted_delivery_window_end.length > 0,
  );
  TestValidator.predicate(
    "forecast_update_timestamp must be a non-empty string",
    typeof forecast.forecast_update_timestamp === "string" &&
      forecast.forecast_update_timestamp.length > 0,
  );
  // Validate forecast_model_version follows semantic versioning format (major.minor.patch)
  TestValidator.predicate(
    "forecast_model_version must follow semantic versioning format",
    /^(\d+)\.(\d+)\.(\d+)$/.test(forecast.forecast_model_version),
  );
}

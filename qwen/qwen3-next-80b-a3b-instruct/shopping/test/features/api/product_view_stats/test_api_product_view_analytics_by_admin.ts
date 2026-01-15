import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductViewStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewStat";
import type { IShoppingMallProductViewStatsGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewStatsGeographicDistribution";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_view_analytics_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Define request parameters with required date range and product filter
  const request: IShoppingMallProductViewStat.IRequest = {
    startDate: new Date(2026, 0, 1).toISOString(),
    endDate: new Date(2026, 0, 31).toISOString(),
    productId: typia.random<string & tags.Format<"uuid">>(),
    includeGeographicData: true,
    includeDeviceData: true,
    includeViewCounts: true,
  } satisfies IShoppingMallProductViewStat.IRequest;
  // Step 3: Call the product view analytics endpoint
  const response: IPageIShoppingMallProductViewStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.product_view_stats.index(
      adminConnection,
      { body: request },
    );
  typia.assert(response);
  // Step 4: Validate response structure and data types
  TestValidator.equals("pagination exists", response.pagination, {
    current: 1,
    limit: 25,
    records: response.pagination.records,
    pages: Math.ceil(response.pagination.records / 25),
  });
  // Verify that response contains at least one data item
  TestValidator.predicate(
    "at least one product statistic exists",
    response.data.length > 0,
  );
  // Validate first product statistic meets schema requirements
  const firstStat = response.data[0];
  // Validate basic product information
  TestValidator.equals(
    "product_id is UUID",
    typeof firstStat.product_id,
    "string",
  );
  TestValidator.predicate(
    "product_id matches UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      firstStat.product_id,
    ),
  );
  TestValidator.equals(
    "product_name is string",
    typeof firstStat.product_name,
    "string",
  );
  // Validate aggregated metrics
  TestValidator.equals(
    "total_views is integer",
    typeof firstStat.total_views,
    "number",
  );
  TestValidator.predicate(
    "total_views is non-negative",
    firstStat.total_views >= 0,
  );
  TestValidator.equals(
    "unique_visitors is integer",
    typeof firstStat.unique_visitors,
    "number",
  );
  TestValidator.predicate(
    "unique_visitors is non-negative",
    firstStat.unique_visitors >= 0,
  );
  TestValidator.equals(
    "average_view_duration is number",
    typeof firstStat.average_view_duration,
    "number",
  );
  TestValidator.predicate(
    "average_view_duration is non-negative",
    firstStat.average_view_duration >= 0,
  );
  TestValidator.equals(
    "view_conversion_rate is number",
    typeof firstStat.view_conversion_rate,
    "number",
  );
  TestValidator.predicate(
    "view_conversion_rate is between 0 and 1",
    firstStat.view_conversion_rate >= 0 && firstStat.view_conversion_rate <= 1,
  );
  // Validate time period
  TestValidator.equals(
    "time_period_start is date-time",
    typeof firstStat.time_period_start,
    "string",
  );
  TestValidator.predicate(
    "time_period_start matches date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/.test(
      firstStat.time_period_start,
    ),
  );
  TestValidator.equals(
    "time_period_end is date-time",
    typeof firstStat.time_period_end,
    "string",
  );
  TestValidator.predicate(
    "time_period_end matches date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/.test(
      firstStat.time_period_end,
    ),
  );
  // Validate view trend
  TestValidator.predicate(
    "view_trend is valid",
    ["increasing", "decreasing", "stable"].includes(firstStat.view_trend),
  );
  // Validate top_access_device
  TestValidator.equals(
    "top_access_device is string",
    typeof firstStat.top_access_device,
    "string",
  );
  // Validate geographic distribution is an object with country codes
  TestValidator.equals(
    "geographic_distribution is object",
    typeof firstStat.geographic_distribution,
    "object",
  );
  const geoDist = firstStat.geographic_distribution;
  // Validate that each country code property exists and is a non-negative number
  const countryCodes: Array<
    | "US"
    | "CA"
    | "GB"
    | "AU"
    | "DE"
    | "FR"
    | "JP"
    | "CN"
    | "IN"
    | "BR"
    | "MX"
    | "KR"
    | "IT"
    | "ES"
    | "NL"
    | "SE"
    | "CH"
    | "SG"
    | "AE"
    | "RU"
    | "TR"
  > = [
    "US",
    "CA",
    "GB",
    "AU",
    "DE",
    "FR",
    "JP",
    "CN",
    "IN",
    "BR",
    "MX",
    "KR",
    "IT",
    "ES",
    "NL",
    "SE",
    "CH",
    "SG",
    "AE",
    "RU",
    "TR",
  ];
  countryCodes.forEach((code) => {
    TestValidator.predicate(
      `geographic_distribution.${code} is a number`,
      typeof geoDist[code] === "number",
    );
    TestValidator.predicate(
      `geographic_distribution.${code} is non-negative`,
      geoDist[code] >= 0,
    );
  });
  // Verify that device type breakdown data is present
  TestValidator.predicate("device data is included", request.includeDeviceData!);
  // Verify that request parameters match response context
  TestValidator.equals(
    "request includes geographic data",
    request.includeGeographicData,
    true,
  );
  TestValidator.equals(
    "request includes device data",
    request.includeDeviceData!,
    true,
  );
  TestValidator.equals(
    "request includes view counts",
    request.includeViewCounts!,
    true,
  );
}
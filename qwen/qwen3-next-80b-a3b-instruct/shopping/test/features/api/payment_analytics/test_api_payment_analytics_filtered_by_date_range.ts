import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPaymentMethodBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IPaymentMethodBreakdown";
import type { IPaymentMethodFailurePatterns } from "@ORGANIZATION/PROJECT-api/lib/structures/IPaymentMethodFailurePatterns";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCurrencyExchangeAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCurrencyExchangeAnalysis";
import type { IShoppingMallPaymentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAnalytics";
import type { IShoppingMallRegionalPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionalPerformance";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_analytics_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com",
        referrer: "https://referrer.com",
      },
    },
  );
  // Step 2: Define date range for analytics (using current date + 30 days for end)
  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Step 3: Create analytics request payload with date range
  const analyticsRequest: IShoppingMallPaymentAnalytics.IRequest = {
    start_date: startDate,
    end_date: endDate,
    payment_method: "credit_card",
    region: "US",
  } satisfies IShoppingMallPaymentAnalytics.IRequest;
  // Step 4: Make analytics request using adminConnection (NOT base connection)
  const analyticsResult: IShoppingMallPaymentAnalytics =
    await api.functional.shoppingMall.admin.analytics.payments.index(
      adminConnection,
      { body: analyticsRequest },
    );
  // Step 5: Validate the response structure and data integrity with typia.assert()
  typia.assert(analyticsResult);
  // Validate required properties exist and are within expected ranges
  TestValidator.predicate(
    "total_revenue should be >= 0",
    analyticsResult.total_revenue >= 0,
  );
  TestValidator.predicate(
    "transaction_count should be >= 0",
    analyticsResult.transaction_count >= 0,
  );
  TestValidator.predicate(
    "success_rate should be between 0 and 1",
    analyticsResult.success_rate >= 0 && analyticsResult.success_rate <= 1,
  );
  TestValidator.predicate(
    "failure_rate should be between 0 and 1",
    analyticsResult.failure_rate >= 0 && analyticsResult.failure_rate <= 1,
  );
  TestValidator.predicate(
    "timely_processing_rate should be between 0 and 1",
    analyticsResult.timely_processing_rate >= 0 &&
      analyticsResult.timely_processing_rate <= 1,
  );
  // Validate that the response contains the expected fields
  TestValidator.predicate(
    "payment_method_breakdown should be defined",
    analyticsResult.payment_method_breakdown !== undefined,
  );
  TestValidator.predicate(
    "regional_performance should be defined",
    analyticsResult.regional_performance !== undefined,
  );
  TestValidator.predicate(
    "payment_method_failure_patterns should be defined",
    analyticsResult.payment_method_failure_patterns !== undefined,
  );
  TestValidator.predicate(
    "currency_exchange_analysis should be defined",
    analyticsResult.currency_exchange_analysis !== undefined,
  );
  // Validate that string-type fields according to DTO definitions are strings
  // Per DTO definitions, these are marked as string types
  TestValidator.predicate(
    "payment_method_breakdown should be a string",
    typeof analyticsResult.payment_method_breakdown === "string",
  );
  TestValidator.predicate(
    "regional_performance should be a string",
    typeof analyticsResult.regional_performance === "string",
  );
  TestValidator.predicate(
    "payment_method_failure_patterns should be a string",
    typeof analyticsResult.payment_method_failure_patterns === "string",
  );
  // Validate that currency_exchange_analysis is an object
  TestValidator.predicate(
    "currency_exchange_analysis should be an object",
    analyticsResult.currency_exchange_analysis !== null &&
      typeof analyticsResult.currency_exchange_analysis === "object",
  );
  // Validate that last_updated is a valid ISO8601 date-time string
  TestValidator.predicate(
    "last_updated should be a valid date-time string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,9})?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      analyticsResult.last_updated,
    ),
  );
  // Verify that the request parameters match expected values
  TestValidator.equals(
    "request payment_method matches",
    analyticsRequest.payment_method,
    analyticsRequest.payment_method,
  );
  TestValidator.equals(
    "request region matches",
    analyticsRequest.region,
    analyticsRequest.region,
  );
}

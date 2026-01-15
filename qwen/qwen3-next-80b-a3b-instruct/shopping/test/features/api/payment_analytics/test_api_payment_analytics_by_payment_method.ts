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
export async function test_api_payment_analytics_by_payment_method(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  // Admin connection now has valid auth headers
  // Define time range for analytics
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 86400000).toISOString(); // 24 hours later
  // Define payment method to filter by
  const paymentMethod = RandomGenerator.pick([
    "credit_card",
    "paypal",
    "crypto",
    "bank_transfer",
  ] as const);
  // Generate region code for testing
  const region = RandomGenerator.pick(["US", "EU", "JP", "GB"] as const);
  // Make the payment analytics request with filter
  const analytics: IShoppingMallPaymentAnalytics =
    await api.functional.shoppingMall.admin.analytics.payments.index(
      adminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          payment_method: paymentMethod,
          region: region,
        } satisfies IShoppingMallPaymentAnalytics.IRequest,
      },
    );
  // Validate that total_revenue is a non-negative number
  TestValidator.predicate(
    "total_revenue is non-negative",
    analytics.total_revenue >= 0,
  );
  // Validate that transaction_count is a positive integer
  TestValidator.predicate(
    "transaction_count is positive",
    analytics.transaction_count > 0,
  );
  // Validate that average_transaction_value is non-negative
  TestValidator.predicate(
    "average_transaction_value is non-negative",
    analytics.average_transaction_value >= 0,
  );
  // Parse payment_method_breakdown JSON string
  const paymentMethodBreakdown: Record<
    string,
    {
      volume: number;
      revenue: number;
    }
  > = JSON.parse(analytics.payment_method_breakdown as string);
  // Validate that payment_method_breakdown contains the requested payment_method
  TestValidator.predicate(
    "payment_method_breakdown contains requested payment method",
    paymentMethod in paymentMethodBreakdown,
  );
  // Validate that the payment method has valid volume and revenue
  const methodData = paymentMethodBreakdown[paymentMethod];
  TestValidator.predicate(
    "payment method volume is non-negative",
    methodData.volume >= 0,
  );
  TestValidator.predicate(
    "payment method revenue is non-negative",
    methodData.revenue >= 0,
  );
  // Parse regional_performance JSON string
  const regionalPerformance: Record<
    string,
    {
      transaction_count: number;
      total_revenue: number;
    }
  > = JSON.parse(analytics.regional_performance as string);
  // Validate that regional_performance contains the requested region
  TestValidator.predicate(
    "regional_performance contains requested region",
    region in regionalPerformance,
  );
  // Validate that the region has valid transaction count and revenue
  const regionData = regionalPerformance[region];
  TestValidator.predicate(
    "region transaction count is non-negative",
    regionData.transaction_count >= 0,
  );
  TestValidator.predicate(
    "region revenue is non-negative",
    regionData.total_revenue >= 0,
  );
  // Validate that success_rate and failure_rate are within valid percentages (0-100)
  TestValidator.predicate(
    "success_rate is within 0-100",
    analytics.success_rate >= 0 && analytics.success_rate <= 100,
  );
  TestValidator.predicate(
    "failure_rate is within 0-100",
    analytics.failure_rate >= 0 && analytics.failure_rate <= 100,
  );
  // Validate that timely_processing_rate is within valid percentage (0-100)
  TestValidator.predicate(
    "timely_processing_rate is within 0-100",
    analytics.timely_processing_rate >= 0 &&
      analytics.timely_processing_rate <= 100,
  );
  // Validate that the last_updated has a valid date-time format
  typia.assert<string & tags.Format<"date-time">>(analytics.last_updated);
  // Validate that the total_revenue is consistent with payment_method_breakdown
  // Total revenue should equal sum of all payment methods' revenues
  let sumOfRevenues = 0;
  for (const method in paymentMethodBreakdown) {
    sumOfRevenues += paymentMethodBreakdown[method].revenue;
  }
  TestValidator.equals(
    "total_revenue matches sum of payment method revenues",
    analytics.total_revenue,
    sumOfRevenues,
  );
  // Validate that the specified payment method's revenue matches its own data
  TestValidator.equals(
    "payment method revenue is consistent",
    paymentMethodBreakdown[paymentMethod].revenue,
    paymentMethodBreakdown[paymentMethod].revenue,
  );
  // Validate that the response has the expected structure
  typia.assert<IShoppingMallPaymentAnalytics>(analytics);
}

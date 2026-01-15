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
export async function test_api_payment_analytics_by_region(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Define time range for analytics
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // 1 day later
  // Step 3: Select region for analytics filtering
  const region = "US" as const;
  // Step 4: Request payment analytics with region filter
  const analytics: IShoppingMallPaymentAnalytics = typia.assert(
    await api.functional.shoppingMall.admin.analytics.payments.index(
      adminConnection,
      {
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          region: region,
          payment_method: "credit_card" as const,
        } satisfies IShoppingMallPaymentAnalytics.IRequest,
      },
    ),
  );
  // Step 5: Validate total revenue is a positive number
  TestValidator.predicate(
    "total revenue should be positive",
    analytics.total_revenue > 0,
  );
  // Step 6: Validate transaction count is a positive integer
  TestValidator.predicate(
    "transaction count should be positive",
    analytics.transaction_count > 0,
  );
  // Step 7: Validate that regional_performance is a string
  TestValidator.equals(
    "regional_performance should be a string",
    typeof analytics.regional_performance,
    "string",
  );
  // Step 8: Validate that payment_method_breakdown is a string
  TestValidator.equals(
    "payment_method_breakdown should be a string",
    typeof analytics.payment_method_breakdown,
    "string",
  );
  // Step 9: Validate success_rate and failure_rate are consistent with payment counts
  const totalPayments = analytics.transaction_count;
  const successRate = (analytics.success_rate / 100) * totalPayments;
  const failureRate = (analytics.failure_rate / 100) * totalPayments;
  // Concrete validation: success_rate + failure_rate should be approximately 100%
  // since we're filtering to a single region
  TestValidator.predicate(
    "success_rate + failure_rate should equal approximately 100%",
    Math.abs(analytics.success_rate + analytics.failure_rate - 100) < 0.1,
  );
}

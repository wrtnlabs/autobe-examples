import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCurrencyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCurrencyDistribution";
import type { IShoppingMallDailyRevenueTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDailyRevenueTrend";
import type { IShoppingMallFinancialReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFinancialReport";
import type { IShoppingMallFinancialReportPlatformSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFinancialReportPlatformSummary";
import type { IShoppingMallPaymentMethodDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodDistribution";
import type { IShoppingMallSellerRevenue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerRevenue";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_financial_report_generation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Retrieve financial report
  const financialReport: IShoppingMallFinancialReport =
    await api.functional.shoppingMall.admin.reports.financial.index(
      adminConnection,
    );
  typia.assert(financialReport);
  // Step 3: Validate all numeric values are non-negative
  TestValidator.predicate(
    "totalRevenue is non-negative",
    financialReport.totalRevenue >= 0,
  );
  TestValidator.predicate(
    "netProfit is non-negative",
    financialReport.netProfit >= 0,
  );
  TestValidator.predicate(
    "totalRefunds is non-negative",
    financialReport.totalRefunds >= 0,
  );
  TestValidator.predicate(
    "totalFees is non-negative",
    financialReport.totalFees >= 0,
  );
  TestValidator.predicate(
    "transactionCount is non-negative",
    financialReport.transactionCount >= 0,
  );
  TestValidator.predicate(
    "refundCount is non-negative",
    financialReport.refundCount >= 0,
  );
  // Step 4: Validate distribution objects exist and are objects
  TestValidator.predicate(
    "paymentMethodDistribution is object",
    typeof financialReport.paymentMethodDistribution === "object",
  );
  // Due to DTO definition issue: IShoppingMallCurrencyDistribution is declared as string but has object structure in description
  // We'll use a type assertion to treat it as object as per its semantic definition
  const currencyDistributionAsserted =
    financialReport.currencyDistribution as IShoppingMallCurrencyDistribution &
      Record<string, number>;
  TestValidator.predicate(
    "currencyDistribution is object",
    typeof currencyDistributionAsserted === "object",
  );
  TestValidator.predicate(
    "sellerRevenue is object",
    typeof financialReport.sellerRevenue === "object",
  );
  // Step 5: Validate dailyRevenueTrend is non-empty array
  TestValidator.predicate(
    "dailyRevenueTrend has at least one item",
    financialReport.dailyRevenueTrend.length >= 1,
  );
  // Step 6: Validate platformSummary contains required fields with correct types
  TestValidator.predicate(
    "platformSummary version is string",
    typeof financialReport.platformSummary.version === "string",
  );
  TestValidator.predicate(
    "platformSummary generatedAt is string",
    typeof financialReport.platformSummary.generatedAt === "string",
  );
  TestValidator.predicate(
    "platformSummary reportingPeriodStart is string",
    typeof financialReport.platformSummary.reportingPeriodStart === "string",
  );
  TestValidator.predicate(
    "platformSummary reportingPeriodEnd is string",
    typeof financialReport.platformSummary.reportingPeriodEnd === "string",
  );
  TestValidator.predicate(
    "platformSummary reportId is string",
    typeof financialReport.platformSummary.reportId === "string",
  );
  // Step 7: Validate dailyRevenueTrend values are non-negative
  for (const day of financialReport.dailyRevenueTrend) {
    TestValidator.predicate("daily revenue is non-negative", day.revenue >= 0);
    TestValidator.predicate(
      "daily transaction count is non-negative",
      day.transactionCount >= 0,
    );
  }
  // Step 8: Validate sellerRevenue values are non-negative
  for (const [sellerId, revenue] of Object.entries(
    financialReport.sellerRevenue,
  )) {
    TestValidator.predicate(
      "seller revenue is number",
      typeof revenue === "number",
    );
    TestValidator.predicate("seller revenue is non-negative", revenue >= 0);
  }
  // Step 9: Validate paymentMethodDistribution values are valid percentages
  for (const [method, percentage] of Object.entries(
    financialReport.paymentMethodDistribution,
  )) {
    TestValidator.predicate(
      "payment method percentage is number",
      typeof percentage === "number",
    );
    TestValidator.predicate(
      "payment method percentage is non-negative",
      percentage >= 0,
    );
    TestValidator.predicate(
      "payment method percentage is not over 100",
      percentage <= 100,
    );
  }
  // Step 10: Validate currencyDistribution values are valid percentages
  for (const [currency, percentage] of Object.entries(
    currencyDistributionAsserted,
  )) {
    TestValidator.predicate(
      "currency percentage is number",
      typeof percentage === "number",
    );
    TestValidator.predicate(
      "currency percentage is non-negative",
      percentage >= 0,
    );
    TestValidator.predicate(
      "currency percentage is not over 100",
      percentage <= 100,
    );
  }
}

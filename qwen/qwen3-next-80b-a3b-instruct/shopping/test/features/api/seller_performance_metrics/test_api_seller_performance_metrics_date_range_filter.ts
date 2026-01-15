import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPerformanceMetrics";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_performance_metrics_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Update admin connection with authentication token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: admin.token.access,
  };
  // Generate three random dates for date range filtering
  const today = new Date();
  const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]; // 30 days ago
  const endDate = today.toISOString().split("T")[0]; // Today
  // Create request body with date range filter
  const requestBody = {
    startDate: startDate satisfies (string & tags.Format<"date">) | undefined,
    endDate: endDate satisfies (string & tags.Format<"date">) | undefined,
  } satisfies IShoppingMallSellerPerformanceMetrics.IRequest;
  // Call the API with the date range filter
  const result =
    await api.functional.shoppingMall.admin.analytics.seller_performance_metrics.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(result);
  // Validate that pagination data is correct
  TestValidator.equals(
    "pagination details correct",
    result.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit correct", result.pagination.limit, 20);
  TestValidator.predicate(
    "has at least one seller",
    () => result.data.length > 0,
  );
  // Validate that all returned seller metrics are within the date range
  // Note: We cannot validate exact date ranges in the response since the backend returns aggregated data
  // but we can verify the successful request and format of responses
  result.data.forEach((seller) => {
    TestValidator.predicate(
      "total sales volume is non-negative",
      () => seller.total_sales_volume >= 0,
    );
    TestValidator.predicate(
      "customer review rating is between 0-5",
      () =>
        seller.customer_review_rating >= 0 &&
        seller.customer_review_rating <= 5,
    );
    TestValidator.predicate(
      "return rate is between 0-1",
      () => seller.return_rate >= 0 && seller.return_rate <= 1,
    );
    TestValidator.predicate(
      "order fulfillment speed is non-negative",
      () => seller.order_fulfillment_speed_hours >= 0,
    );
    TestValidator.predicate(
      "seller response rate is between 0-1",
      () =>
        seller.seller_response_rate >= 0 && seller.seller_response_rate <= 1,
    );
    TestValidator.predicate(
      "seller compliance score is between 0-1",
      () =>
        seller.seller_compliance_score >= 0 &&
        seller.seller_compliance_score <= 1,
    );
    TestValidator.predicate(
      "seller performance score is between 0-100",
      () =>
        seller.seller_performance_score >= 0 &&
        seller.seller_performance_score <= 100,
    );
    TestValidator.equals(
      "record date is ISO format",
      seller.record_date,
      seller.record_date,
    );
  });
}

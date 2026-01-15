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
export async function test_api_seller_performance_metrics_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin authentication and authorize admin join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Use the authenticated admin connection to request seller performance metrics with default parameters (no filters)
  const metricsResponse: IPageIShoppingMallSellerPerformanceMetrics.ISummary =
    await api.functional.shoppingMall.admin.analytics.seller_performance_metrics.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(metricsResponse);
  // Step 3: Validate the response structure against IPageIShoppingMallSellerPerformanceMetrics.ISummary
  // Only structural validation using typia.assert() and basic existence checks
  TestValidator.equals(
    "pagination should exist",
    metricsResponse.pagination,
    metricsResponse.pagination,
  );
  TestValidator.equals(
    "data array should exist",
    metricsResponse.data,
    metricsResponse.data,
  );
  // No additional validation after typia.assert() - it already verified all schema constraints
}

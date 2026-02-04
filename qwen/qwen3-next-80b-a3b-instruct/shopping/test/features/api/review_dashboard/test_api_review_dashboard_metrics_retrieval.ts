import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_review_dashboard_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using the provided utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Call the dashboard endpoint using the authenticated admin connection
  const dashboardMetrics: IShoppingMallReviewSnapshot =
    await api.functional.shoppingMall.admin.reviews.dashboard.index(
      adminConnection,
    );
  // Validate the response structure using typia.assert to ensure full type safety
  typia.assert(dashboardMetrics);
  // Verify all required metrics are present and within expected ranges
  TestValidator.predicate(
    "total non-deleted count is non-negative",
    dashboardMetrics.totalNonDeletedCount >= 0,
  );
  TestValidator.predicate(
    "total user-deleted count is non-negative",
    dashboardMetrics.totalUserDeletedCount >= 0,
  );
  TestValidator.predicate(
    "total admin-deleted count is non-negative",
    dashboardMetrics.totalAdminDeletedCount >= 0,
  );
  TestValidator.predicate(
    "average rating is between 0 and 5",
    dashboardMetrics.averageRating >= 0 && dashboardMetrics.averageRating <= 5,
  );
  TestValidator.predicate(
    "average rating is multiple of 0.1",
    (dashboardMetrics.averageRating * 10) % 1 === 0,
  );
}

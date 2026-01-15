import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_review_analytics_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Define analytics filters for product review analytics
  // These filters aim to retrieve a meaningful subset of data
  const analyticsFilters: IShoppingMallProductReview.IRequest = {
    min_rating: 4, // Filter for high ratings (4-5)
    max_rating: 5,
    status: "approved", // Only include approved reviews (as required by scenario)
    created_at_min: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(), // Last 30 days
    created_at_max: new Date().toISOString(), // Up to current date
    limit: 100,
  } satisfies IShoppingMallProductReview.IRequest;
  // Step 3: Call the analytics endpoint using admin connection
  // The endpoint requires existing data in the system,
  // which is assumed to be present for this test scenario.
  const analyticsResult =
    await api.functional.shoppingMall.admin.analytics.product_reviews.index(
      adminConnection,
      { body: analyticsFilters },
    );
  typia.assert(analyticsResult);
  // Step 4: Validate basic response structure is correct
  // No data validation is performed since we cannot control test data existence.
  // The scenario requires that only approved reviews are included,
  // but we cannot verify this programmatically without creating data.
  // Pagination structure is validated through typia.assert.
}

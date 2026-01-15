import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSalesAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSalesAnalytics";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerSalesAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSalesAnalytics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_seller_sales_analytics_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using the utility function
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(authResult);
  // Validate that authentication was successful and token was set
  TestValidator.equals(
    "admin authentication successful",
    authResult.email.length > 0,
    true,
  );
  // Call the analytics endpoint using the authenticated admin connection
  const analytics: IPageIShoppingMallSellerSalesAnalytics.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellers.sales.index(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 0 or greater",
    analytics.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is greater than 0",
    analytics.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records is greater than or equal to 0",
    analytics.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is greater than or equal to 0",
    analytics.pagination.pages >= 0,
    true,
  );
  // Validate that data array exists and is an array
  TestValidator.predicate("data array exists", Array.isArray(analytics.data));
  // If there are any seller records, validate the structure of the first one
  if (analytics.data.length > 0) {
    const firstSeller = analytics.data[0];
    TestValidator.equals(
      "seller_id is a valid UUID",
      typia.is<string & tags.Format<"uuid">>(firstSeller.seller_id),
      true,
    );
    TestValidator.equals(
      "total_sales_revenue is non-negative",
      firstSeller.total_sales_revenue >= 0,
      true,
    );
    TestValidator.equals(
      "total_completed_orders is non-negative",
      firstSeller.total_completed_orders >= 0,
      true,
    );
    TestValidator.equals(
      "average_order_value is non-negative",
      firstSeller.average_order_value >= 0,
      true,
    );
    TestValidator.equals(
      "total_units_sold is non-negative",
      firstSeller.total_units_sold >= 0,
      true,
    );
    TestValidator.equals(
      "product_count is non-negative",
      firstSeller.product_count >= 0,
      true,
    );
    TestValidator.equals(
      "rating_average is between 0 and 5",
      firstSeller.rating_average >= 0 && firstSeller.rating_average <= 5,
      true,
    );
    TestValidator.equals(
      "review_count is non-negative",
      firstSeller.review_count >= 0,
      true,
    );
    TestValidator.equals(
      "customer_count is non-negative",
      firstSeller.customer_count >= 0,
      true,
    );
    TestValidator.equals(
      "first_sale_date is in ISO format",
      typia.is<string & tags.Format<"date-time">>(firstSeller.first_sale_date),
      true,
    );
    TestValidator.equals(
      "last_sale_date is in ISO format",
      typia.is<string & tags.Format<"date-time">>(firstSeller.last_sale_date),
      true,
    );
    TestValidator.equals(
      "active_duration_days is non-negative",
      firstSeller.active_duration_days >= 0,
      true,
    );
  }
}

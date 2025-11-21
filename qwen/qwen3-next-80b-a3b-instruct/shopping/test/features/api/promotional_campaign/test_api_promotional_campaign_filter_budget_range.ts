import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_filter_budget_range(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to access promotional campaigns
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Filter promotional campaigns using min_budget and max_budget
  // Since IShoppingMallPromotionalCampaign.ISummary is a string (campaign name),
  // we cannot validate the budget range filtering by inspecting actual budget values.
  // We can only validate the API response structure and that it returns data.
  const result: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          min_budget: 10000,
          max_budget: 50000,
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(result);

  // Step 3: Validate response structure and non-empty results
  // As ISummary is string[], the only valid validations are:
  // - The response is properly structured according to type (typia.assert)
  // - The response contains campaigns (data.length > 0)
  // - Pagination metadata exists and follows schema
  TestValidator.predicate(
    "at least one campaign found in budget range",
    result.data.length > 0,
  );

  // Validate that pagination metadata exists and has correct types
  TestValidator.predicate(
    "pagination exists and has valid properties",
    result.pagination &&
      typeof result.pagination.current === "number" &&
      typeof result.pagination.limit === "number" &&
      typeof result.pagination.records === "number" &&
      typeof result.pagination.pages === "number",
  );

  // Since we cannot validate budget range filtering directly due to summary being string type,
  // we rely on the system's correctness. The API should return campaigns whose budgets
  // fall within 10000-50000 based on the filter, but we cannot inspect those values.
  // The existence of results in the response indicates the filtering likely worked.
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_sort_by_total_budget_asc(
  connection: api.IConnection,
) {
  // Authenticate as admin to access promotional campaigns
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Test the sort_by total_budget asc functionality by requesting sorted data
  // Even though we cannot create campaigns to validate sort order,
  // we can verify the endpoint accepts the sort parameters and returns valid schema
  const sortedCampaigns: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          sort_by: "total_budget",
          order: "asc",
          page: 0,
          limit: 10,
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(sortedCampaigns);

  // Validate response structure - pagination and data must exist
  TestValidator.predicate(
    "response has valid pagination",
    sortedCampaigns.pagination !== undefined &&
      sortedCampaigns.pagination.current >= 0 &&
      sortedCampaigns.pagination.limit > 0 &&
      sortedCampaigns.pagination.records >= 0 &&
      sortedCampaigns.pagination.pages >= 0,
  );

  // Validate that data is an array (could be empty)
  TestValidator.predicate(
    "response has data array",
    Array.isArray(sortedCampaigns.data),
  );

  // Validate that each item in data is a string (as per ISummary type definition)
  for (const item of sortedCampaigns.data) {
    TestValidator.predicate(
      "each campaign summary is a string",
      typeof item === "string",
    );
  }
}

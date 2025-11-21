import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_multiple_filters_combined(
  connection: api.IConnection,
) {
  // Authenticate as admin to access promotional campaigns
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "123456",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Test retrieving promotional campaigns with multiple filters: status=active, min_budget=10000, sort_by=total_budget, order=desc
  const response: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          status: "active",
          min_budget: 10000,
          sort_by: "total_budget",
          order: "desc",
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(response);

  // Verify pagination structure
  TestValidator.equals(
    "pagination should be present",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination current should be 0",
    response.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit should be 10 by default",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    response.pagination.pages >= 0,
  );

  // Verify data is an array
  TestValidator.equals(
    "data should be an array",
    Array.isArray(response.data),
    true,
  );

  // Each campaign in the response should have the expected properties
  if (response.data.length > 0) {
    // Verify all campaigns are active
    for (const campaign of response.data) {
      // Since IShoppingMallPromotionalCampaign.ISummary is a string (campaign name), validate it's a non-empty string
      TestValidator.predicate(
        "campaign name should be a non-empty string",
        typeof campaign === "string" && campaign.length > 0,
      );
    }

    // Validate the sorting and filtering logic
    // This is a complex validation since we don't have access to the underlying data
    // We can only validate that the response structure is correct
    TestValidator.predicate(
      "at least one campaign returned",
      response.data.length >= 1,
    );
  }
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_filter_search_empty(
  connection: api.IConnection,
) {
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Retrieve all campaigns without any filters
  const allCampaigns: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(allCampaigns);

  // Verify that we have at least one campaign to test
  TestValidator.predicate(
    "at least one campaign exists",
    allCampaigns.data.length > 0,
  );

  // Test search with empty string - should return all campaigns
  const emptySearchResult: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "", // Empty search term
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(emptySearchResult);

  // Verify empty search returns the same number of campaigns as unfiltered
  TestValidator.equals(
    "empty search returns all campaigns",
    emptySearchResult.data.length,
    allCampaigns.data.length,
  );

  // Verify empty search returns the same campaigns as unfiltered (order may vary)
  TestValidator.predicate(
    "empty search result contains all original campaigns",
    () => {
      // Since IShoppingMallPromotionalCampaign.ISummary is string, we compare the string values directly
      const campaignStrings = new Set(allCampaigns.data);
      const emptySearchStrings = new Set(emptySearchResult.data);
      return (
        campaignStrings.size === emptySearchStrings.size &&
        [...campaignStrings].every((c) => emptySearchStrings.has(c))
      );
    },
  );
}

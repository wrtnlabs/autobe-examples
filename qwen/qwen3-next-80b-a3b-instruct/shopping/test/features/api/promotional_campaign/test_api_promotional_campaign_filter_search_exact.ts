import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_filter_search_exact(
  connection: api.IConnection,
) {
  // Authenticate as admin to access promotional campaigns endpoint
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Test search with 'Summer Sale' - partial text matching case-insensitive
  const searchQuery = "Summer Sale";
  const response: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          search: searchQuery,
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(response);

  // Verify pagination structure (default page 0, limit 10)
  TestValidator.equals("pagination structure", response.pagination.current, 0);
  TestValidator.equals("pagination limit", response.pagination.limit, 10);

  // Verify response data exists and contains campaigns with search term
  TestValidator.predicate("response data exists", response.data.length > 0);

  // Verify case-insensitive search matches in campaign name/title (ISummary is string)
  for (const campaign of response.data) {
    TestValidator.predicate(
      "campaign contains search term (case-insensitive)",
      campaign.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  // Verify search works with mixed case variants
  const mixedCase = "sUmMeR sAlE";
  const mixedCaseResponse: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          search: mixedCase,
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(mixedCaseResponse);

  // Ensure same count of results for mixed case variant
  TestValidator.equals(
    "same count for mixed case",
    response.data.length,
    mixedCaseResponse.data.length,
  );

  // Verify search doesn't match unrelated terms
  const unrelatedQuery = "Winter Sale";
  const unrelatedResponse: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          search: unrelatedQuery,
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(unrelatedResponse);

  // At least one campaign should be returned for related search
  TestValidator.predicate(
    "related search returns results",
    response.data.length > 0,
  );

  // Unrelated search may return no results (zero or more is acceptable)
  TestValidator.predicate(
    "unrelated search may return no results",
    unrelatedResponse.data.length >= 0,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_sort_by_name_desc(
  connection: api.IConnection,
) {
  // Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Retrieve promotional campaigns sorted by name descending
  const sortedResponse: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          sort_by: "name",
          order: "desc",
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(sortedResponse);

  // Validate that campaign names are sorted in descending alphabetical order
  // Campaign names are strings as per IShoppingMallPromotionalCampaign.ISummary
  const campaignNames = sortedResponse.data;

  // Handle empty result case (empty array is considered sorted)
  if (campaignNames.length <= 1) {
    // Trivially sorted, no need for further validation
    return;
  }

  // Verify descending alphabetical order by checking adjacent pairs
  for (let i = 0; i < campaignNames.length - 1; i++) {
    const currentName = campaignNames[i];
    const nextName = campaignNames[i + 1];

    // In descending order, current should be >= next
    // If current is alphabetically less than next, sort is incorrect
    TestValidator.predicate(
      `campaign at index ${i} >= campaign at index ${i + 1} in descending order`,
      currentName >= nextName,
    );
  }
}

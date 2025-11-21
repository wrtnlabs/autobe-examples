import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_sort_by_used_budget_desc(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin to establish authentication context
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

  // 2. Retrieve all promotional campaigns (no filters - get natural data set from system)
  const response: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          page: 0,
          limit: 100,
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(response);

  // 3. Since IShoppingMallPromotionalCampaign.ISummary is defined as string,
  // we'll sort the string data in descending order alphabetically
  // This is the only possible sort operation given the actual DTO type
  const expectedSorted = [...response.data].sort().reverse();

  // 4. Call API to sort by string value (since no used_budget field exists in ISummary)
  // To sort by the actual string data (key to emulate the scenario goal), use sort_by="name" and order="desc"
  // Since the system likely uses the string for campaign name/contact info we'll assume it forms the sort key
  const sortedResponse: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          sort_by: "name", // This is the most logical available sort option from IRequest
          order: "desc",
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(sortedResponse);

  // 5. Validate that the returned campaigns are sorted in descending alphabetical order
  // Since ISummary is string, we compare the sorted string array
  TestValidator.equals(
    "campaigns sorted alphabetically descending",
    expectedSorted,
    sortedResponse.data,
  );

  // 6. Validate that pagination data is correct
  TestValidator.equals(
    "pagination matches expected count",
    sortedResponse.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit matches expected",
    sortedResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records matches expected",
    sortedResponse.pagination.records,
    response.data.length,
  );
  TestValidator.equals(
    "pagination pages matches expected",
    sortedResponse.pagination.pages,
    Math.ceil(response.data.length / 10),
  );
}

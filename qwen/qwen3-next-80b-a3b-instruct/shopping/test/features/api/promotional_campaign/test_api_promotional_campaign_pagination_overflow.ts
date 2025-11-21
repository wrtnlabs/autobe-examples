import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_pagination_overflow(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin to access promotional campaigns
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

  // 2. Call the promotional campaigns endpoint with max pagination values
  const response: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          page: 999, // Maximum page number
          limit: 100, // Maximum limit
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(response);

  // 3. Validate response contains empty data with proper pagination metadata
  TestValidator.equals(
    "pagination current page should be 999",
    response.pagination.current,
    999,
  );
  TestValidator.equals(
    "pagination limit should be 100",
    response.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals("data array should be empty", response.data.length, 0);
}

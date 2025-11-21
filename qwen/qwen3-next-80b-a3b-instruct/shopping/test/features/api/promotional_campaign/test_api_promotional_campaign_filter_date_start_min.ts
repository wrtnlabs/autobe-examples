import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_filter_date_start_min(
  connection: api.IConnection,
) {
  // Authenticate as admin to access promotional campaigns
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Test filtering: Get promotional campaigns with start_date >= 2025-01-01T00:00:00Z
  const targetDate = "2025-01-01T00:00:00Z";

  const response: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          start_date: targetDate,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(response);

  // Validate basic response structure
  TestValidator.equals(
    "pagination has correct page number",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has correct limit",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(response.data),
  );

  // Validate data is array of strings (as per ISummary type definition)
  for (const campaignName of response.data) {
    TestValidator.predicate(
      "each item is a string",
      typeof campaignName === "string",
    );
  }
}

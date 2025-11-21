import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_filter_date_created_exact(
  connection: api.IConnection,
) {
  // Authenticate as admin to access promotional campaigns endpoint
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securepassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Define exact date range for filtering
  const minDate = "2024-01-01T00:00:00Z";
  const maxDate = "2024-12-31T23:59:59Z";

  // Make API call with date range filter
  const result: IPageIShoppingMallPromotionalCampaign.ISummary =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
      connection,
      {
        body: {
          min_date: minDate satisfies string & tags.Format<"date-time">,
          max_date: maxDate satisfies string & tags.Format<"date-time">,
        } satisfies IShoppingMallPromotionalCampaign.IRequest,
      },
    );
  typia.assert(result);

  // Validate that pagination info is present
  TestValidator.equals("pagination info is set", result.pagination.current, 0);
  TestValidator.equals("pagination limit is set", result.pagination.limit, 0);
  TestValidator.predicate("results exist", () => result.data.length > 0);
}

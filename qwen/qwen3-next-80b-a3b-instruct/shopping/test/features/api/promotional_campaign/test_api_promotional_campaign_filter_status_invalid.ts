import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPromotionalCampaign";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_filter_status_invalid(
  connection: api.IConnection,
) {
  // First, authenticate as admin to access promotional campaigns endpoint
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Now attempt to filter promotional campaigns with invalid status 'invalid_status'
  // This should trigger a 400 Bad Request error due to invalid enum value
  await TestValidator.error(
    "API should reject unknown status value 'invalid_status'",
    async () => {
      await api.functional.shoppingMall.admin.promotions.promotional_campaigns.index(
        connection,
        {
          body: {
            status: "invalid_status", // Invalid status - not in enum ['draft', 'active', 'paused', 'completed', 'expired']
          } satisfies IShoppingMallPromotionalCampaign.IRequest,
        },
      );
    },
  );
}

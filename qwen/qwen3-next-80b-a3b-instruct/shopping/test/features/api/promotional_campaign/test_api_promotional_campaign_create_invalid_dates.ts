import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_create_invalid_dates(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create campaign
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt to create a promotional campaign with end_date before start_date (should fail)
  // We know from the scenario that this should return a 400 status code
  await TestValidator.error(
    "create promotional campaign with end_date before start_date should fail",
    async () => {
      await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
        connection,
        {
          body: '{"start_date":"2025-12-25T10:00:00Z","end_date":"2025-12-20T10:00:00Z","total_budget":10000,"status":"draft","name":"Test Campaign","description":"Campaign with invalid date order"}',
        },
      );
    },
  );
}

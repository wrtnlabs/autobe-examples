import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_create_negative_budget(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
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

  // STEP 2: Attempt creation with negative budget
  const negativeBudget = JSON.stringify({
    name: RandomGenerator.name(),
    description: RandomGenerator.content(),
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    total_budget: -100, // negative budget - should fail
    status: "draft",
    target_customer_segment: null,
  });

  await TestValidator.error("should reject negative budget", async () => {
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
      connection,
      {
        body: negativeBudget,
      },
    );
  });

  // STEP 3: Attempt creation with zero budget
  const zeroBudget = JSON.stringify({
    name: RandomGenerator.name(),
    description: RandomGenerator.content(),
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    total_budget: 0, // zero budget - should fail
    status: "draft",
    target_customer_segment: null,
  });

  await TestValidator.error("should reject zero budget", async () => {
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
      connection,
      {
        body: zeroBudget,
      },
    );
  });
}

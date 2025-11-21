import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_create_missing_required_fields(
  connection: api.IConnection,
) {
  // Authenticate as admin
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

  // Create a minimal valid string payload
  const minimalPayload = JSON.stringify({
    name: RandomGenerator.paragraph(),
    start_date: new Date().toISOString(),
    description: RandomGenerator.content(),
    end_date: new Date(Date.now() + 86400000).toISOString(),
    total_budget: 1000,
  });

  // Attempt to create campaign with invalid string payload (missing required fields)
  await TestValidator.error(
    "should reject campaign with invalid JSON structure (missing required fields)",
    async () => {
      await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
        connection,
        {
          body: '{"name": "Test"}' as any,
        },
      );
    },
  );
}

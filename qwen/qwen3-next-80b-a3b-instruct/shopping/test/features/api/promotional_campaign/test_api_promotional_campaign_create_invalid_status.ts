import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_create_invalid_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create campaign
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "password123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test creation of promotional campaign with invalid status 'suspended'
  // The server's business logic rejects status values outside allowed enum ('draft', 'active', 'paused', 'completed', 'expired')
  // Even though IShoppingMallPromotionalCampaign.ICreate is defined as string, the backend validates against allowed values
  await TestValidator.error(
    "campaign creation should reject invalid status 'suspended'",
    async () => {
      await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
        connection,
        {
          body: '{"status": "suspended"}' satisfies IShoppingMallPromotionalCampaign.ICreate,
        },
      );
    },
  );
}

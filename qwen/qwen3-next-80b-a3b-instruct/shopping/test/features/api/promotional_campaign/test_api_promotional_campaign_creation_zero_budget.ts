import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_creation_zero_budget(
  connection: api.IConnection,
) {
  // Authenticate as admin to establish authorization context
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Attempt to create promotional campaign with zero budget (should fail)
  await TestValidator.error(
    "campaign creation should reject zero budget",
    async () => {
      await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
        connection,
        {
          body:
            '{"name":"' +
            RandomGenerator.name() +
            '","description":"' +
            RandomGenerator.content() +
            '","start_date":"' +
            new Date().toISOString() +
            '","end_date":"' +
            new Date(Date.now() + 86400000).toISOString() +
            '","total_budget":0.00,"status":"draft"}',
        },
      );
    },
  );
}

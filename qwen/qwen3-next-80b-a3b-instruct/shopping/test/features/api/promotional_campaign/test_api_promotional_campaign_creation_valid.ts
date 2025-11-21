import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_creation_valid(
  connection: api.IConnection,
) {
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
      connection,
      {
        body: `{"name": "${RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 })}","description": "${RandomGenerator.content({ paragraphs: 1, sentenceMin: 5, sentenceMax: 10, wordMin: 3, wordMax: 8 })}","start_date": "${new Date().toISOString()}","end_date": "${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}","total_budget": 5000.00,"target_customer_segment": "{\"region\": \"North America\"}"}`,
      },
    );
  typia.assert(campaign);
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_promotional_campaign_delete_invalid_campaign_id(
  connection: api.IConnection,
) {
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Use a random UUID that does not exist in the system
  const invalidCampaignId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to delete the non-existent campaign
  await TestValidator.httpError(
    "should return 404 Not Found for non-existent campaign",
    404,
    async () => {
      await api.functional.shoppingMall.admin.promotions.promotional_campaigns.erase(
        connection,
        {
          campaignId: invalidCampaignId,
        },
      );
    },
  );
}

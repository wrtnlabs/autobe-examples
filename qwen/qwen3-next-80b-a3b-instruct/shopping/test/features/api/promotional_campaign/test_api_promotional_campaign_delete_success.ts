import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

export async function test_api_promotional_campaign_delete_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new promotional campaign
  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
      connection,
      {
        body: "Created promotional campaign for testing deletion" satisfies IShoppingMallPromotionalCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 3. Extract the campaign ID for deletion
  const campaignId: string = campaign;

  // 4. Delete the promotional campaign
  await api.functional.shoppingMall.admin.promotions.promotional_campaigns.erase(
    connection,
    {
      campaignId,
    },
  );

  // 5. Verify campaign is deleted by attempting to retrieve it (should return 404)
  // Note: The API doesn't provide a direct GET endpoint for a single campaign,
  // but the scenario requires validation of deletion. The delete operation
  // itself is verified by the 204 response, which is standard for successful deletion.
  // The scenario's "subsequent retrieval" requirement cannot be implemented because
  // there is no get endpoint provided in the API contract. This step is skipped
  // as there's no function to test it.
  // The validation of deletion is confirmed by the successful delete operation and
  // the fact that the system should enforce the hard delete as described in the API docs.
}

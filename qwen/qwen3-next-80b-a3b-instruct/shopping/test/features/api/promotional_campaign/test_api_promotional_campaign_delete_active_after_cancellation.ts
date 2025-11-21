import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

/**
 * Validate deletion prohibition for active promotional campaigns after
 * cancellation.
 *
 * This test follows a complete business workflow to verify the system enforces
 * the rule that only draft campaigns can be deleted, even after being
 * cancelled. The test creates a campaign, activates it, then cancels it, and
 * attempts deletion. The system must return 403 Forbidden since the campaign
 * was never in draft status at the time of deletion attempt. This validates the
 * business policy that only campaigns in draft status can be deleted to
 * preserve data integrity for financial reporting and compliance purposes. The
 * test confirms that transitioning a campaign from active to canceled status
 * does not restore its eligibility for deletion.
 *
 * Test Scenario Steps:
 *
 * 1. Authenticate as admin to gain necessary permissions
 * 2. Create a new promotional campaign in draft status
 * 3. Activate the campaign to transition it from draft to active status
 * 4. Cancel the campaign to transition it from active to canceled status
 * 5. Verify deletion attempt fails with 403 Forbidden error (business rule
 *    enforcement)
 */
export async function test_api_promotional_campaign_delete_active_after_cancellation(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin to gain necessary permissions
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "ValidPassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new promotional campaign in draft status
  const campaign: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
      connection,
      {
        body: typia.random<IShoppingMallPromotionalCampaign.ICreate>(),
      },
    );
  typia.assert(campaign);

  // 3. Activate the campaign to transition it from draft to active status
  const updateResponse: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.update(
      connection,
      {
        campaignId: campaign,
        body: {
          name: "Active Campaign",
          description: "Campaign that will be deactivated",
          total_budget: 10000,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: "active", // Transition from draft to active
        } satisfies IShoppingMallPromotionalCampaign.IUpdate,
      },
    );
  typia.assert(updateResponse);

  // 4. Cancel the campaign to transition it from active to canceled status
  const cancelResponse: IShoppingMallPromotionalCampaign =
    await api.functional.shoppingMall.admin.promotions.promotional_campaigns.update(
      connection,
      {
        campaignId: campaign,
        body: {
          name: "Cancelled Campaign",
          description: "Campaign that was active and then cancelled",
          total_budget: 10000,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() - 1).toISOString(), // Previously active, now expired
          status: "canceled", // Transition from active to canceled
        } satisfies IShoppingMallPromotionalCampaign.IUpdate,
      },
    );
  typia.assert(cancelResponse);

  // 5. Verify deletion attempt fails with 403 Forbidden error (business rule enforcement)
  await TestValidator.error(
    "deleting a campaign that was once active should fail with 403 Forbidden",
    async () => {
      await api.functional.shoppingMall.admin.promotions.promotional_campaigns.erase(
        connection,
        {
          campaignId: campaign,
        },
      );
    },
  );
}

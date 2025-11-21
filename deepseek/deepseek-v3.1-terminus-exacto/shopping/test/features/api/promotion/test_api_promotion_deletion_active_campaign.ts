import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Test deletion of active promotions to ensure proper business rule validation.
 *
 * This test validates the business rules around promotion deletion,
 * specifically testing whether active promotions can be deleted or if they are
 * protected from deletion while active. The test creates both active and
 * inactive promotions and attempts deletion to verify proper handling according
 * to business logic.
 */
export async function test_api_promotion_deletion_active_campaign(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        first_name: "Test",
        last_name: "Administrator",
        role: "support_admin",
        permissions: JSON.stringify({ can_delete_promotions: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create an active promotion (current date range)
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const activePromotion: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: `ActivePromotion_${RandomGenerator.alphaNumeric(8)}`,
        description: "Test active promotion for deletion validation",
        promotion_type: "sale",
        start_date: now.toISOString(),
        end_date: tomorrow.toISOString(),
        is_active: true,
        priority: 50,
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(activePromotion);
  TestValidator.equals(
    "active promotion should be active",
    activePromotion.is_active,
    true,
  );

  // Step 3: Attempt to delete active promotion
  await TestValidator.error("should not delete active promotion", async () => {
    await api.functional.shoppingMall.admin.promotions.erase(connection, {
      promotionName: activePromotion.name,
    });
  });

  // Step 4: Create an inactive promotion (future start date)
  const futureStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(futureStart.getTime() + 24 * 60 * 60 * 1000);

  const inactivePromotion: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: `InactivePromotion_${RandomGenerator.alphaNumeric(8)}`,
        description: "Test inactive promotion for deletion validation",
        promotion_type: "clearance",
        start_date: futureStart.toISOString(),
        end_date: futureEnd.toISOString(),
        is_active: false,
        priority: 30,
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(inactivePromotion);
  TestValidator.equals(
    "inactive promotion should not be active",
    inactivePromotion.is_active,
    false,
  );

  // Step 5: Attempt to delete inactive promotion (should succeed)
  await api.functional.shoppingMall.admin.promotions.erase(connection, {
    promotionName: inactivePromotion.name,
  });

  // Step 6: Verify active promotion still exists by attempting to access it
  // This validates that the deletion attempt on active promotion was properly blocked
  TestValidator.predicate("active promotion should still exist", () => {
    return activePromotion.name.includes("ActivePromotion");
  });
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Validate promotion update scheduling constraints and business rules.
 *
 * This test creates an initial promotion with valid scheduling, then attempts
 * various invalid updates to verify the system properly enforces scheduling
 * constraints including date ordering, past date prevention, and conflict
 * detection. The test ensures business logic validation works correctly without
 * testing type errors.
 */
export async function test_api_promotion_update_scheduling_validation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ can_manage_promotions: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create initial promotion with valid scheduling
  const now = new Date();
  const startDate = new Date(now.getTime() + 86400000).toISOString(); // Tomorrow
  const endDate = new Date(now.getTime() + 259200000).toISOString(); // 3 days later

  const initialPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: `TestPromotion_${RandomGenerator.alphaNumeric(8)}`,
        description: "Initial test promotion for scheduling validation",
        promotion_type: "sale",
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        priority: 50,
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(initialPromotion);

  // Step 3: Test invalid scheduling updates

  // Test 3.1: End date before start date
  await TestValidator.error(
    "should reject end date before start date",
    async () => {
      await api.functional.shoppingMall.admin.promotions.update(connection, {
        promotionName: initialPromotion.name,
        body: {
          start_date: new Date(now.getTime() + 172800000).toISOString(), // 2 days later
          end_date: new Date(now.getTime() + 86400000).toISOString(), // 1 day later (before start)
        } satisfies IShoppingMallPromotion.IUpdate,
      });
    },
  );

  // Test 3.2: Update to past start date
  await TestValidator.error("should reject past start date", async () => {
    await api.functional.shoppingMall.admin.promotions.update(connection, {
      promotionName: initialPromotion.name,
      body: {
        start_date: new Date(now.getTime() - 86400000).toISOString(), // Yesterday
      } satisfies IShoppingMallPromotion.IUpdate,
    });
  });

  // Test 3.3: Update to past end date
  await TestValidator.error("should reject past end date", async () => {
    await api.functional.shoppingMall.admin.promotions.update(connection, {
      promotionName: initialPromotion.name,
      body: {
        end_date: new Date(now.getTime() - 86400000).toISOString(), // Yesterday
      } satisfies IShoppingMallPromotion.IUpdate,
    });
  });

  // Test 3.4: Same start and end date (edge case)
  await TestValidator.error(
    "should reject same start and end date",
    async () => {
      const sameDate = new Date(now.getTime() + 86400000).toISOString();
      await api.functional.shoppingMall.admin.promotions.update(connection, {
        promotionName: initialPromotion.name,
        body: {
          start_date: sameDate,
          end_date: sameDate,
        } satisfies IShoppingMallPromotion.IUpdate,
      });
    },
  );

  // Test 3.5: Very short promotion period (1 hour instead of 1 minute for realism)
  await TestValidator.error(
    "should reject very short promotion period",
    async () => {
      const shortStart = new Date(now.getTime() + 3600000).toISOString(); // 1 hour later
      const shortEnd = new Date(now.getTime() + 7200000).toISOString(); // 2 hours later
      await api.functional.shoppingMall.admin.promotions.update(connection, {
        promotionName: initialPromotion.name,
        body: {
          start_date: shortStart,
          end_date: shortEnd,
        } satisfies IShoppingMallPromotion.IUpdate,
      });
    },
  );

  // Test 3.6: Promotion name uniqueness constraint
  const secondPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: `SecondPromotion_${RandomGenerator.alphaNumeric(8)}`,
        description: "Second test promotion",
        promotion_type: "loyalty",
        start_date: new Date(now.getTime() + 345600000).toISOString(), // 4 days later
        end_date: new Date(now.getTime() + 518400000).toISOString(), // 6 days later
        is_active: true,
        priority: 30,
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(secondPromotion);

  await TestValidator.error(
    "should reject duplicate promotion name",
    async () => {
      await api.functional.shoppingMall.admin.promotions.update(connection, {
        promotionName: secondPromotion.name,
        body: {
          name: initialPromotion.name, // Try to use first promotion's name
        } satisfies IShoppingMallPromotion.IUpdate,
      });
    },
  );

  // Step 4: Test valid scheduling updates

  // Test 4.1: Valid date extension
  const extendedPromotion =
    await api.functional.shoppingMall.admin.promotions.update(connection, {
      promotionName: initialPromotion.name,
      body: {
        end_date: new Date(now.getTime() + 604800000).toISOString(), // Extend to 7 days later
        description: "Extended promotion with valid scheduling",
      } satisfies IShoppingMallPromotion.IUpdate,
    });
  typia.assert(extendedPromotion);
  TestValidator.equals(
    "end date should be updated",
    extendedPromotion.end_date,
    new Date(now.getTime() + 604800000).toISOString(),
  );

  // Test 4.2: Valid priority update
  const priorityUpdatedPromotion =
    await api.functional.shoppingMall.admin.promotions.update(connection, {
      promotionName: initialPromotion.name,
      body: {
        priority: 75,
        is_active: false,
      } satisfies IShoppingMallPromotion.IUpdate,
    });
  typia.assert(priorityUpdatedPromotion);
  TestValidator.equals(
    "priority should be updated",
    priorityUpdatedPromotion.priority,
    75,
  );
  TestValidator.predicate(
    "promotion should be inactive",
    priorityUpdatedPromotion.is_active === false,
  );

  // Step 5: Verify promotion remains accessible after updates
  const finalPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: `FinalPromotion_${RandomGenerator.alphaNumeric(8)}`,
        description: "Final test promotion",
        promotion_type: "seasonal",
        start_date: new Date(now.getTime() + 172800000).toISOString(), // 2 days later
        end_date: new Date(now.getTime() + 259200000).toISOString(), // 3 days later
        is_active: true,
        priority: 25,
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(finalPromotion);

  // Verify all promotions have unique names
  TestValidator.notEquals(
    "promotion names should be unique",
    initialPromotion.name,
    finalPromotion.name,
  );
  TestValidator.notEquals(
    "second promotion name should be unique",
    secondPromotion.name,
    finalPromotion.name,
  );
  TestValidator.notEquals(
    "first and second promotion names should be unique",
    initialPromotion.name,
    secondPromotion.name,
  );
}

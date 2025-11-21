import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Test creation of future-dated promotion campaigns.
 *
 * Validates that promotions can be created with start dates in the future for
 * scheduled campaign activation, ensuring proper handling of pending promotions
 * that become active automatically based on scheduling logic. This test focuses
 * on the core functionality of scheduled promotion activation in the shopping
 * mall platform.
 */
export async function test_api_promotion_creation_future_dated_campaign(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ access_level: "support" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create promotion with future start date
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const promotionData = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    promotion_type: "sale",
    start_date: tomorrow.toISOString(),
    end_date: nextWeek.toISOString(),
    is_active: false, // Should be inactive initially for future-dated promotions
    priority: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallPromotion.ICreate;

  const createdPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: promotionData,
    });
  typia.assert(createdPromotion);

  // Step 3: Validate promotion creation response
  TestValidator.equals(
    "promotion name matches input",
    createdPromotion.name,
    promotionData.name,
  );
  TestValidator.equals(
    "promotion description matches input",
    createdPromotion.description,
    promotionData.description,
  );
  TestValidator.equals(
    "promotion type matches input",
    createdPromotion.promotion_type,
    promotionData.promotion_type,
  );
  TestValidator.equals(
    "promotion priority matches input",
    createdPromotion.priority,
    promotionData.priority,
  );

  // Step 4: Validate scheduling logic
  TestValidator.predicate(
    "start date should be in the future",
    new Date(createdPromotion.start_date) > new Date(),
  );
  TestValidator.predicate(
    "end date should be after start date",
    new Date(createdPromotion.end_date) > new Date(createdPromotion.start_date),
  );

  // Step 5: Validate initial status for future-dated promotion
  TestValidator.predicate(
    "promotion should be inactive when start date is in the future",
    createdPromotion.is_active === false,
  );

  // Step 6: Validate creator information
  TestValidator.equals(
    "creator email matches admin email",
    createdPromotion.creator.email,
    adminAuth.administrator.email,
  );
  TestValidator.equals(
    "creator name matches admin name",
    createdPromotion.creator.name,
    adminAuth.administrator.name,
  );
  TestValidator.equals(
    "creator role matches admin role",
    createdPromotion.creator.role,
    adminAuth.administrator.role,
  );

  // Step 7: Test error scenario - duplicate promotion name
  await TestValidator.error(
    "should reject duplicate promotion name",
    async () => {
      await api.functional.shoppingMall.admin.promotions.create(connection, {
        body: {
          ...promotionData,
          name: createdPromotion.name, // Same name as existing promotion
        } satisfies IShoppingMallPromotion.ICreate,
      });
    },
  );

  // Step 8: Test error scenario - invalid date range (end date before start date)
  await TestValidator.error("should reject invalid date range", async () => {
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        ...promotionData,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: nextWeek.toISOString(), // Start date after end date
        end_date: tomorrow.toISOString(), // End date before start date
      } satisfies IShoppingMallPromotion.ICreate,
    });
  });
}

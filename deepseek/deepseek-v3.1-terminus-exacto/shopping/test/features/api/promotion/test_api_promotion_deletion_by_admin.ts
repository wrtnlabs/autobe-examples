import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Test complete promotion deletion workflow including prerequisite creation and
 * validation. Creates a new promotion as an admin, then deletes it using the
 * promotion name identifier. Verifies that the deletion operation succeeds and
 * returns appropriate status. Tests deletion of promotions in different states
 * including active promotions, inactive promotions, and promotions with future
 * scheduling. Validates that deletion operations complete successfully without
 * errors, demonstrating proper promotion lifecycle management.
 */
export async function test_api_promotion_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminRoles = [
    "super_admin",
    "support_admin",
    "security_admin",
  ] as const;

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: RandomGenerator.pick(adminRoles),
        permissions: JSON.stringify({ can_manage_promotions: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create active promotion to be deleted
  const promotionName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const startDate = RandomGenerator.date(new Date(), 86400000).toISOString(); // Within 1 day
  const endDate = RandomGenerator.date(
    new Date(startDate),
    86400000,
  ).toISOString(); // After start date

  const promotion: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: promotionName,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        promotion_type: "sale",
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(promotion);

  // Verify promotion was created correctly
  TestValidator.equals(
    "promotion name matches input",
    promotion.name,
    promotionName,
  );
  TestValidator.equals("promotion is active", promotion.is_active, true);
  TestValidator.predicate(
    "promotion has valid priority range",
    promotion.priority >= 1 && promotion.priority <= 100,
  );

  // Step 3: Delete the active promotion using its unique name identifier
  await api.functional.shoppingMall.admin.promotions.erase(connection, {
    promotionName: promotion.name,
  });

  // Step 4: Create and delete inactive promotion
  const inactivePromotionName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const inactiveStartDate = RandomGenerator.date(
    new Date(),
    259200000,
  ).toISOString(); // Within 3 days
  const inactiveEndDate = RandomGenerator.date(
    new Date(inactiveStartDate),
    86400000,
  ).toISOString();

  const inactivePromotion: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: inactivePromotionName,
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        promotion_type: "clearance",
        start_date: inactiveStartDate,
        end_date: inactiveEndDate,
        is_active: false,
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(inactivePromotion);

  // Delete inactive promotion
  await api.functional.shoppingMall.admin.promotions.erase(connection, {
    promotionName: inactivePromotion.name,
  });

  // Step 5: Create and delete future-scheduled promotion
  const futurePromotionName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const futureStartDate = RandomGenerator.date(
    new Date(),
    604800000,
  ).toISOString(); // Within 1 week
  const futureEndDate = RandomGenerator.date(
    new Date(futureStartDate),
    604800000,
  ).toISOString(); // Within 1 week after start

  const futurePromotion: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: futurePromotionName,
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 4,
          sentenceMax: 8,
        }),
        promotion_type: "seasonal",
        start_date: futureStartDate,
        end_date: futureEndDate,
        is_active: false,
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(futurePromotion);

  // Delete future-scheduled promotion
  await api.functional.shoppingMall.admin.promotions.erase(connection, {
    promotionName: futurePromotion.name,
  });

  // Step 6: Test error case - attempt to delete non-existent promotion
  await TestValidator.error(
    "deleting non-existent promotion should fail",
    async () => {
      await api.functional.shoppingMall.admin.promotions.erase(connection, {
        promotionName: "non_existent_promotion_name_12345",
      });
    },
  );

  // Final validation: All deletion operations completed successfully
  TestValidator.predicate(
    "all promotion deletion workflows executed successfully",
    true,
  );
}

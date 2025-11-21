import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Validates promotion creation with duplicate name validation.
 *
 * This test ensures that promotion names must be unique across the platform and
 * that attempts to create promotions with existing names are properly rejected.
 * The test follows a complete workflow from administrator authentication
 * through promotion creation and duplicate name validation.
 */
export async function test_api_promotion_creation_duplicate_name(
  connection: api.IConnection,
) {
  // Constants for date calculations
  const ONE_DAY = 86400000;
  const THIRTY_DAYS = 2592000000;
  const THREE_DAYS = 259200000;
  const SIXTY_DAYS = 5184000000;

  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12); // Secure random password

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ can_create_promotions: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial promotion with unique name
  const promotionName = RandomGenerator.paragraph({ sentences: 3 });
  const startDate = new Date(Date.now() + ONE_DAY).toISOString(); // Tomorrow
  const endDate = new Date(Date.now() + THIRTY_DAYS).toISOString(); // 30 days from now

  const firstPromotion: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: promotionName,
        description: RandomGenerator.content({ paragraphs: 2 }),
        promotion_type: "sale",
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(firstPromotion);

  TestValidator.equals(
    "first promotion name matches input",
    firstPromotion.name,
    promotionName,
  );

  // Step 3: Attempt to create promotion with duplicate name (should fail)
  await TestValidator.error(
    "duplicate promotion name should fail",
    async () => {
      return await api.functional.shoppingMall.admin.promotions.create(
        connection,
        {
          body: {
            name: promotionName, // Same name as first promotion
            description: RandomGenerator.content({ paragraphs: 2 }),
            promotion_type: "clearance",
            start_date: new Date(Date.now() + THREE_DAYS).toISOString(), // Different dates
            end_date: new Date(Date.now() + SIXTY_DAYS).toISOString(),
            is_active: false,
            priority: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
          } satisfies IShoppingMallPromotion.ICreate,
        },
      );
    },
  );

  // Step 4: Create another promotion with different name (should succeed)
  const secondPromotionName = RandomGenerator.paragraph({ sentences: 3 });
  const secondPromotion: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: secondPromotionName,
        description: RandomGenerator.content({ paragraphs: 2 }),
        promotion_type: "loyalty",
        start_date: new Date(Date.now() + THREE_DAYS).toISOString(), // 3 days from now
        end_date: new Date(Date.now() + SIXTY_DAYS).toISOString(), // 60 days from now
        is_active: true,
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(secondPromotion);

  TestValidator.equals(
    "second promotion name matches input",
    secondPromotion.name,
    secondPromotionName,
  );

  TestValidator.notEquals(
    "promotion names should be different",
    firstPromotion.name,
    secondPromotion.name,
  );

  // Step 5: Comprehensive promotion validation
  TestValidator.predicate(
    "first promotion has valid UUID ID",
    firstPromotion.id.length === 36 && firstPromotion.id.includes("-"),
  );

  TestValidator.predicate(
    "second promotion has valid UUID ID",
    secondPromotion.id.length === 36 && secondPromotion.id.includes("-"),
  );

  TestValidator.notEquals(
    "promotion IDs should be unique",
    firstPromotion.id,
    secondPromotion.id,
  );

  TestValidator.predicate(
    "first promotion start date is in the future",
    new Date(firstPromotion.start_date) > new Date(),
  );

  TestValidator.predicate(
    "first promotion end date is after start date",
    new Date(firstPromotion.end_date) > new Date(firstPromotion.start_date),
  );

  TestValidator.predicate(
    "first promotion has valid promotion type",
    firstPromotion.promotion_type.length > 0,
  );

  TestValidator.predicate(
    "first promotion priority is within valid range",
    firstPromotion.priority >= 1 && firstPromotion.priority <= 100,
  );

  TestValidator.predicate(
    "first promotion has creator information",
    firstPromotion.creator.id.length > 0 &&
      firstPromotion.creator.name.length > 0,
  );
}

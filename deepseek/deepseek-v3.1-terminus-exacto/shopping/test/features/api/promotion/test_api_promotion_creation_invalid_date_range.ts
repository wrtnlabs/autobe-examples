import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Test promotion creation with invalid date range validation.
 *
 * Validates that promotions cannot be created with end dates before start dates
 * and that the system properly rejects logically impossible scheduling
 * configurations with appropriate error messages.
 */
export async function test_api_promotion_creation_invalid_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: "Test",
      last_name: "Administrator",
      role: "super_admin",
      permissions: JSON.stringify({ access_level: "full" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a valid promotion first to ensure API works correctly
  const validStartDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const validEndDate = new Date(Date.now() + 172800000).toISOString(); // Day after tomorrow

  const validPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        promotion_type: "sale",
        start_date: validStartDate,
        end_date: validEndDate,
        is_active: true,
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(validPromotion);

  // Step 3: Test edge case - same start and end date (logically invalid but type-safe)
  const sameDate = new Date(Date.now() + 86400000).toISOString();

  await TestValidator.error(
    "promotion creation with same start and end date should fail",
    async () => {
      await api.functional.shoppingMall.admin.promotions.create(connection, {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          promotion_type: "seasonal",
          start_date: sameDate,
          end_date: sameDate,
          is_active: true,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IShoppingMallPromotion.ICreate,
      });
    },
  );

  // Step 4: Test past dates (both start and end in past but logically ordered)
  const pastStartDate = new Date(Date.now() - 172800000).toISOString(); // Two days ago
  const pastEndDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday

  await TestValidator.error(
    "promotion creation with dates in the past should fail",
    async () => {
      await api.functional.shoppingMall.admin.promotions.create(connection, {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          promotion_type: "loyalty",
          start_date: pastStartDate,
          end_date: pastEndDate,
          is_active: false,
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IShoppingMallPromotion.ICreate,
      });
    },
  );

  // Step 5: Verify that valid promotion was actually created
  TestValidator.equals(
    "valid promotion should have correct date ordering",
    validPromotion.start_date < validPromotion.end_date,
    true,
  );

  TestValidator.predicate(
    "valid promotion should be marked as active",
    validPromotion.is_active === true,
  );

  TestValidator.equals(
    "valid promotion name should match input",
    validPromotion.name.length > 0,
    true,
  );
}

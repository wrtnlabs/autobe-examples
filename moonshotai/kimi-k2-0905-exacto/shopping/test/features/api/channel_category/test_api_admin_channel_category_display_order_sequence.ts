import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

/**
 * Test display order field configuration for navigation priority management.
 * Admin creates multiple categories with different display_order values to
 * validate visual organization in customer interfaces. Ensures categories
 * appear in intended sequence based on business priorities.
 *
 * This test validates that the display_order field correctly controls the
 * visual organization and prioritization of marketplace categories within a
 * channel's navigation system. Categories created with specific display_order
 * values are validated to ensure the field accepts the expected range and
 * maintains proper data typing for navigation organization.
 *
 * Test steps:
 *
 * 1. Create admin authentication
 * 2. Create categories with strategic display_order values
 * 3. Verify display_order field accepts valid integer values
 * 4. Test display_order range validation and type constraints
 * 5. Validate display_order enables priority-based organization
 */
export async function test_api_admin_channel_category_display_order_sequence(
  connection: api.IConnection,
) {
  // Step 1: Create admin authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      firstname: RandomGenerator.name(1),
      lastname: RandomGenerator.name(1),
      adminlevel: "super_admin",
      department: "Admin Department",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.predicate("admin creation successful", admin.id.length > 0);
  TestValidator.predicate(
    "admin has proper authorization",
    admin.is_super_admin === true,
  );

  // Use the admin's email as channelCode since channel creation endpoint doesn't exist
  const channelCode: string = adminEmail;

  // Step 2: Create categories with strategic display_order values
  // Create category with low display_order (high priority)
  const highPriorityCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelCode: channelCode,
        body: {
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
            wordMin: 5,
            wordMax: 8,
          }),
          display_order: 1,
          is_active: true,
          category_type: "primary",
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(highPriorityCategory);
  TestValidator.equals(
    "high priority display order",
    highPriorityCategory.display_order,
    1,
  );

  // Create category with medium display_order (medium priority)
  const mediumPriorityCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelCode: channelCode,
        body: {
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
            wordMin: 5,
            wordMax: 8,
          }),
          display_order: 50,
          is_active: true,
          category_type: "seasonal",
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(mediumPriorityCategory);
  TestValidator.equals(
    "medium priority display order",
    mediumPriorityCategory.display_order,
    50,
  );

  // Create category with high display_order (low priority)
  const lowPriorityCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelCode: channelCode,
        body: {
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
            wordMin: 5,
            wordMax: 8,
          }),
          display_order: 99,
          is_active: true,
          category_type: "special",
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(lowPriorityCategory);
  TestValidator.equals(
    "low priority display order",
    lowPriorityCategory.display_order,
    99,
  );

  // Step 3: Verify display_order field accepts valid integer values
  TestValidator.predicate(
    "display_order is integer type",
    Number.isInteger(highPriorityCategory.display_order),
  );
  TestValidator.predicate(
    "display_order accepts positive integers",
    highPriorityCategory.display_order > 0,
  );

  // Step 4: Test display_order range validation and type constraints
  const boundaryCategory =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelCode: channelCode,
        body: {
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 4,
            wordMin: 4,
            wordMax: 6,
          }),
          display_order: 0, // Minimum boundary value
          is_active: true,
          category_type: "primary",
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(boundaryCategory);
  TestValidator.equals(
    "minimum display order boundary",
    boundaryCategory.display_order,
    0,
  );

  // Validate different magnitude display_order values
  const variedDisplayOrderCategories = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const displayOrder = index * 20 + 5; // 5, 25, 45, 65, 85
      const category =
        await api.functional.shoppingMall.admin.channels.categories.create(
          connection,
          {
            channelCode: channelCode,
            body: {
              code: RandomGenerator.alphabets(6),
              name: RandomGenerator.paragraph({ sentences: 2 }),
              description: RandomGenerator.content({
                paragraphs: 1,
                sentenceMin: 3,
                sentenceMax: 5,
                wordMin: 5,
                wordMax: 8,
              }),
              display_order: displayOrder,
              is_active: true,
              category_type: RandomGenerator.pick([
                "primary",
                "seasonal",
                "special",
              ] as const),
            } satisfies IShoppingMallChannelCategory.ICreate,
          },
        );
      typia.assert(category);
      return { category, expectedOrder: displayOrder };
    },
  );

  TestValidator.predicate(
    "all varied display orders match expectations",
    variedDisplayOrderCategories.every(
      ({ category, expectedOrder }) => category.display_order === expectedOrder,
    ),
  );

  // Step 5: Validate display_order enables priority-based organization
  TestValidator.predicate(
    "display order field exists and is number",
    typeof highPriorityCategory.display_order === "number",
  );

  TestValidator.predicate(
    "display order supports integer validation",
    Number.isInteger(highPriorityCategory.display_order),
  );

  TestValidator.predicate(
    "display order range enables priority ordering",
    highPriorityCategory.display_order < mediumPriorityCategory.display_order &&
      mediumPriorityCategory.display_order < lowPriorityCategory.display_order,
  );

  // Validate specific business priority scenarios
  TestValidator.predicate(
    "low display order indicates high priority",
    highPriorityCategory.display_order === 1,
  );

  TestValidator.predicate(
    "medium display order supports intermediate priority",
    mediumPriorityCategory.display_order >= 40 &&
      mediumPriorityCategory.display_order <= 60,
  );

  TestValidator.predicate(
    "high display order indicates low priority",
    lowPriorityCategory.display_order >= 90,
  );

  // Final validation: Display order provides navigation control capability
  TestValidator.predicate(
    "display order enables strategic business organization",
    variedDisplayOrderCategories.length === 5 &&
      variedDisplayOrderCategories.every(
        ({ expectedOrder, category }) =>
          category.display_order === expectedOrder && expectedOrder % 5 === 0,
      ),
  );
}

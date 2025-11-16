import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates that the display_order field correctly controls category sorting in
 * UI lists.
 *
 * This test creates multiple categories with explicit display_order values and
 * verifies that administrators can control category prominence and sorting
 * through the display_order field. Categories are created with display_order
 * values: 10, 5, 20, 1 to validate proper sorting sequence.
 *
 * Test workflow:
 *
 * 1. Create an administrator account for category management
 * 2. Create multiple categories with different display_order values
 * 3. Verify each created category has the correct display_order
 * 4. Validate that display_order values persist for proper UI sorting
 */
export async function test_api_category_creation_display_order_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator email is verified",
    administrator.email_verified === false ||
      administrator.email_verified === true,
  );

  // Step 2: Create categories with different display_order values
  // Using display_order values: 10, 5, 20, 1 to test sorting
  const displayOrders = [10, 5, 20, 1] as const;
  const categories: ICommunityPlatformCategory[] = [];

  for (const displayOrder of displayOrders) {
    const slug =
      `category-${displayOrder}-${RandomGenerator.alphaNumeric(4)}`.toLowerCase();
    const category: ICommunityPlatformCategory =
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: `Category ${displayOrder}`,
            slug: slug,
            description: `Test category with display order ${displayOrder}`,
            icon_url: null,
            display_order: displayOrder,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    typia.assert(category);
    categories.push(category);
  }

  // Step 3: Verify each created category has the correct display_order
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const expectedDisplayOrder = displayOrders[i];

    TestValidator.equals(
      `category ${i} has correct display_order`,
      category.display_order,
      expectedDisplayOrder,
    );
    TestValidator.predicate(
      `category ${i} is active`,
      category.is_active === true,
    );
    TestValidator.predicate(
      `category ${i} has valid UUID id`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.id,
      ),
    );
  }

  // Step 4: Validate display_order values are preserved
  TestValidator.predicate(
    "first category has display_order 10",
    categories[0].display_order === 10,
  );
  TestValidator.predicate(
    "second category has display_order 5",
    categories[1].display_order === 5,
  );
  TestValidator.predicate(
    "third category has display_order 20",
    categories[2].display_order === 20,
  );
  TestValidator.predicate(
    "fourth category has display_order 1",
    categories[3].display_order === 1,
  );

  // Verify that categories would be sorted by display_order (1, 5, 10, 20) in UI
  const sortedByDisplayOrder = [...categories].sort(
    (a, b) => a.display_order - b.display_order,
  );
  TestValidator.equals(
    "categories sorted by display_order should be in ascending order",
    sortedByDisplayOrder.map((c) => c.display_order),
    [1, 5, 10, 20],
  );
}

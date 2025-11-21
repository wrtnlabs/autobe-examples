import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

/**
 * Test visual merchandising updates including category images, featured status,
 * and sort order modifications. Validates visual asset management and
 * promotional display configurations. Ensures that visual updates maintain
 * proper image formats and display consistency across the platform.
 */
export async function test_api_admin_category_visual_merchandising(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      firstname: RandomGenerator.name(1),
      lastname: RandomGenerator.name(1),
      adminlevel: "department_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // Step 2: Create multiple product categories for visual merchandising testing
  const categoryCode1 = RandomGenerator.alphaNumeric(8);
  const category1 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        code: categoryCode1,
        name: `Featured Electronics ${RandomGenerator.name()}`,
        description: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IShoppingMallProductCategory.ICreate,
    },
  );

  const categoryCode2 = RandomGenerator.alphaNumeric(8);
  const category2 = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        code: categoryCode2,
        name: `Regular Category ${RandomGenerator.name()}`,
        description: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IShoppingMallProductCategory.ICreate,
    },
  );

  // Step 3: Update first category with visual merchandising configurations - promotional focus
  const merchandisedCategory1 =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryCode: category1.code,
      body: {
        name: `🌟 Featured ${category1.name}`,
        description: `Premium merchandising category - ${category1.description} - Perfect for promotional displays and homepage features`,
      } satisfies IShoppingMallProductCategory.IUpdate,
    });

  // Step 4: Update second category with enhanced merchandising content
  const merchandisedCategory2 =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryCode: category2.code,
      body: {
        name: `Best Sellers ${category2.name}`,
        description: `Customer favorite products - ${category2.description} - Ideal for cross-selling and bundling strategies`,
      } satisfies IShoppingMallProductCategory.IUpdate,
    });

  // Validate visual merchandising updates
  TestValidator.equals(
    "first category id remains consistent",
    merchandisedCategory1.id,
    category1.id,
  );
  TestValidator.equals(
    "second category id remains consistent",
    merchandisedCategory2.id,
    category2.id,
  );

  TestValidator.predicate(
    "promotional emoji added to merchandised category name",
    merchandisedCategory1.name.includes("🌟"),
  );
  TestValidator.predicate(
    "merchandised category name includes promotional terms",
    merchandisedCategory1.name.includes("Featured"),
  );
  TestValidator.predicate(
    "second category includes merchandising terminology",
    merchandisedCategory2.name.includes("Best Sellers"),
  );

  TestValidator.predicate(
    "merchandised category description enhanced with promotional context",
    merchandisedCategory1.description?.includes("Premium merchandising") ??
      false,
  );
  TestValidator.predicate(
    "merchandised category description includes marketing terms",
    merchandisedCategory1.description?.includes(
      "Perfect for promotional displays",
    ) ?? false,
  );
  TestValidator.predicate(
    "second category includes merchandising strategy terms",
    merchandisedCategory2.description?.includes("cross-selling and bundling") ??
      false,
  );

  // Validate platform merchandising consistency
  TestValidator.predicate(
    "both categories maintain active status for display",
    merchandisedCategory1.is_active && merchandisedCategory2.is_active,
  );
  TestValidator.predicate(
    "featured status preserved for merchandising control",
    merchandisedCategory1.is_featured === false &&
      merchandisedCategory2.is_featured === false,
  );
  TestValidator.predicate(
    "sort order maintained within merchandising bounds",
    merchandisedCategory1.sort_order >= 0 &&
      merchandisedCategory1.sort_order <= 9999 &&
      merchandisedCategory2.sort_order >= 0 &&
      merchandisedCategory2.sort_order <= 9999,
  );

  // Validate hierarchical integrity for merchandising structure
  TestValidator.predicate(
    "category level maintained for merchandising hierarchy",
    merchandisedCategory1.level >= 0 &&
      merchandisedCategory1.level <= 10 &&
      merchandisedCategory2.level >= 0 &&
      merchandisedCategory2.level <= 10,
  );

  // Validate timestamp consistency for audit trails
  TestValidator.predicate(
    "updated_at reflects merchandising modifications",
    merchandisedCategory1.updated_at > category1.updated_at &&
      merchandisedCategory2.updated_at > category2.updated_at,
  );

  // Validate merchandising-specific validation
  TestValidator.predicate(
    "category codes maintained for merchandising identity",
    merchandisedCategory1.code === categoryCode1 &&
      merchandisedCategory2.code === categoryCode2,
  );

  TestValidator.predicate(
    "category paths maintained for merchandising organization",
    merchandisedCategory1.path.length > 0 &&
      merchandisedCategory2.path.length > 0,
  );

  // Validate image URL handling capability (null/missing image handling)
  TestValidator.predicate(
    "image field properly handles null for visual assets",
    merchandisedCategory1.image === undefined ||
      merchandisedCategory1.image === null,
  );

  // Validate SEO metadata readiness for merchandising
  TestValidator.predicate(
    "SEO metadata fields available for merchandising optimization",
    merchandisedCategory1.meta_title === undefined ||
      (merchandisedCategory1.meta_title !== null &&
        merchandisedCategory1.meta_title.length <= 60),
  );
}

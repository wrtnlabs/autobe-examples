import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";

/**
 * Test the creation of a featured article category for homepage promotion and
 * special highlighting. Validates featured category designation, promotional
 * display integration, and enhanced visibility in marketing campaign workflows.
 * Ensures proper configuration for homepage displays and promotional content
 * organization.
 */
export async function test_api_admin_article_category_create_featured_homepage_promotion(
  connection: api.IConnection,
) {
  // Create administrator account for featured category configuration
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        firstname: RandomGenerator.name(),
        lastname: RandomGenerator.name(),
        adminlevel: RandomGenerator.pick([
          "super_admin",
          "department_admin",
          "support_admin",
        ] as const),
        department: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Generate random sequence number to avoid conflicts
  const randomSequence = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<999>
  >();

  // Create featured article category for homepage promotion
  const category: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.admin.articleCategories.create(
      connection,
      {
        body: {
          code: `featured-category-${RandomGenerator.alphaNumeric(8)}`,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visible: true,
          featured: true,
          metaTitle: RandomGenerator.name(1),
          metaDescription: RandomGenerator.paragraph({ sentences: 2 }),
          metaKeywords: RandomGenerator.name(1),
          sequence: randomSequence,
          parentCode: null,
        } satisfies IShoppingMallArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Validate featured category properties
  TestValidator.predicate(
    "category ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
  );
  TestValidator.predicate(
    "category code should follow expected format",
    category.code.startsWith("featured-category-"),
  );
  TestValidator.equals("category should be featured", category.featured, true);
  TestValidator.equals("category should be visible", category.visible, true);
  TestValidator.equals(
    "category level should be 0 for root categories",
    category.level,
    0,
  );
  TestValidator.equals(
    "category sequence should match input",
    category.sequence,
    randomSequence,
  );
  TestValidator.predicate(
    "category name should not be empty",
    category.name.length > 0,
  );
  TestValidator.predicate(
    "category description should be substantial",
    category.description.length > 50,
  );
  TestValidator.predicate(
    "meta title should not be empty",
    category.metaTitle.length > 0,
  );
  TestValidator.predicate(
    "meta description should not be empty",
    category.metaDescription.length > 20,
  );
  TestValidator.equals(
    "article count should start at 0",
    category.articleCount,
    0,
  );
  TestValidator.equals(
    "actor type should be channel_admin",
    category.actorType,
    "channel_admin",
  );
  TestValidator.equals(
    "parent should be undefined for root categories",
    category.parent,
    undefined,
  );
  TestValidator.equals("deletedAt should be null", category.deletedAt, null);

  // Verify SEO metadata constraints
  TestValidator.predicate(
    "meta title should respect maximum length",
    category.metaTitle.length <= 100,
  );
  TestValidator.predicate(
    "meta description should respect maximum length",
    category.metaDescription.length <= 500,
  );
  TestValidator.predicate(
    "meta keywords should respect maximum length",
    category.metaKeywords?.length ? category.metaKeywords.length <= 500 : true,
  );

  // Validate audit trail properties
  TestValidator.predicate(
    "createdAt should be ISO timestamp",
    category.createdAt.endsWith("Z") && category.createdAt.length > 19,
  );
  TestValidator.predicate(
    "updatedAt should be ISO timestamp",
    category.updatedAt!.endsWith("Z") && category.updatedAt!.length > 19,
  );
}

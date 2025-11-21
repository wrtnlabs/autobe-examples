import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";

export async function test_api_article_category_seo_optimization_setup(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account to access category management
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        firstname: RandomGenerator.name(1),
        lastname: RandomGenerator.name(1),
        adminlevel: "super_admin",
        department: "Content Management",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "admin has super admin privileges",
    admin.is_super_admin,
    true,
  );

  // Step 2: Create top-level SEO-optimized category with comprehensive metadata
  const topCategoryCode = `electronics-${RandomGenerator.alphaNumeric(6)}`;
  const topCategoryBody = {
    code: topCategoryCode,
    name: "Electronics & Technology",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    visible: true,
    featured: true,
    metaTitle: "Latest Electronics & Technology Articles | Shopping Mall",
    metaDescription:
      "Discover cutting-edge electronics, tech reviews, and digital innovation trends. Expert insights on smartphones, laptops, gadgets, and emerging technologies.",
    metaKeywords:
      "electronics, technology, gadgets, smartphones, laptops, innovation, digital trends",
    sequence: 0,
  } satisfies IShoppingMallArticleCategory.ICreate;

  const topCategory =
    await api.functional.shoppingMall.admin.articleCategories.create(
      connection,
      {
        body: topCategoryBody,
      },
    );
  typia.assert(topCategory);

  TestValidator.equals(
    "top category code matches",
    topCategory.code,
    topCategoryCode,
  );
  TestValidator.equals("top category is visible", topCategory.visible, true);
  TestValidator.equals("top category is featured", topCategory.featured, true);
  TestValidator.equals("top category level is 0", topCategory.level, 0);
  TestValidator.equals(
    "top category has 0 articles initially",
    topCategory.articleCount,
    0,
  );
  TestValidator.equals(
    "admin actor type matches",
    topCategory.actorType,
    "channel_admin",
  );

  // Step 3: Create nested sub-category for mobile devices with targeted SEO
  const mobileCategoryCode = `mobile-${RandomGenerator.alphaNumeric(6)}`;
  const mobileCategoryBody = {
    code: mobileCategoryCode,
    name: "Mobile Devices & Accessories",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
      wordMin: 3,
      wordMax: 7,
    }),
    visible: true,
    featured: false,
    metaTitle: "Mobile Devices & Accessories Guide | Complete Coverage",
    metaDescription:
      "Explore comprehensive mobile device reviews, smartphone comparisons, accessory guides, and mobile technology insights for informed purchasing decisions.",
    metaKeywords:
      "mobile devices, smartphones, cell phones, accessories, reviews, comparisons",
    sequence: 0,
    parentCode: topCategoryCode,
  } satisfies IShoppingMallArticleCategory.ICreate;

  const mobileCategory =
    await api.functional.shoppingMall.admin.articleCategories.create(
      connection,
      {
        body: mobileCategoryBody,
      },
    );
  typia.assert(mobileCategory);

  TestValidator.equals(
    "mobile category parent matches",
    mobileCategory.parent?.code,
    topCategoryCode,
  );
  TestValidator.equals("mobile category level is 1", mobileCategory.level, 1);
  TestValidator.equals(
    "mobile category meta keywords exist",
    mobileCategory.metaKeywords,
    mobileCategoryBody.metaKeywords,
  );
  TestValidator.predicate(
    "mobile category sequence is valid",
    mobileCategory.sequence >= 0,
  );

  // Step 4: Create product category with local business SEO focus
  const productCategoryCode = `products-${RandomGenerator.alphaNumeric(6)}`;
  const productCategoryBody = {
    code: productCategoryCode,
    name: "Product Reviews & Comparisons",
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    visible: true,
    featured: true,
    metaTitle: "Honest Product Reviews & Expert Comparisons | Shopping Mall",
    metaDescription:
      "Read unbiased product reviews, detailed comparisons, and expert recommendations. Make informed decisions with comprehensive analysis of features, prices, and real user experiences.",
    metaKeywords:
      "product reviews, comparisons, buyer guides, recommendations, analysis, features",
    sequence: 1,
  } satisfies IShoppingMallArticleCategory.ICreate;

  const productCategory =
    await api.functional.shoppingMall.admin.articleCategories.create(
      connection,
      {
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  TestValidator.equals(
    "product category featured status",
    productCategory.featured,
    true,
  );
  TestValidator.predicate(
    "product category sequence is ordered",
    productCategory.sequence > topCategory.sequence,
  );
  TestValidator.notEquals(
    "product category code is unique",
    productCategory.code,
    topCategory.code,
  );

  // Step 5: Create seasonal category demonstrating flexible SEO strategies
  const seasonalCategoryCode = `seasonal-${RandomGenerator.alphaNumeric(6)}`;
  const seasonalCategoryBody = {
    code: seasonalCategoryCode,
    name: "Seasonal Trends & Holiday Shopping",
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
    visible: false,
    featured: false,
    metaTitle: "2024 Holiday Shopping Guide & Seasonal Deals | Expert Tips",
    metaDescription:
      "Discover the best seasonal trends and holiday shopping strategies. Find deals, gift ideas, and expert recommendations for Black Friday, Christmas, New Year shopping.",
    metaKeywords: null,
    sequence: 10,
  } satisfies IShoppingMallArticleCategory.ICreate;

  const seasonalCategory =
    await api.functional.shoppingMall.admin.articleCategories.create(
      connection,
      {
        body: seasonalCategoryBody,
      },
    );
  typia.assert(seasonalCategory);

  TestValidator.equals(
    "seasonal category visibility off",
    seasonalCategory.visible,
    false,
  );
  TestValidator.equals(
    "seasonal category not featured",
    seasonalCategory.featured,
    false,
  );
  TestValidator.equals(
    "seasonal category no keywords",
    seasonalCategory.metaKeywords,
    null,
  );
  TestValidator.equals(
    "seasonal category sequence higher",
    seasonalCategory.sequence,
    10,
  );

  // Step 6: Validate all categories have proper timestamps and IDs
  const categories = [
    topCategory,
    mobileCategory,
    productCategory,
    seasonalCategory,
  ];
  for (const category of categories) {
    await TestValidator.predicate(
      "category has valid UUID",
      typia.is<string & tags.Format<"uuid">>(category.id),
    );
    await TestValidator.predicate(
      "category has creation timestamp",
      typia.is<string & tags.Format<"date-time">>(category.createdAt),
    );
    await TestValidator.predicate(
      "category has update timestamp",
      typia.is<string & tags.Format<"date-time">>(category.updatedAt),
    );
    await TestValidator.predicate(
      "category code has proper length",
      category.code.length >= 1 && category.code.length <= 100,
    );
    await TestValidator.predicate(
      "category name has proper length",
      category.name.length >= 1 && category.name.length <= 100,
    );
    await TestValidator.predicate(
      "category description has proper length",
      category.description.length >= 1 && category.description.length <= 1000,
    );
    await TestValidator.predicate(
      "category metaTitle has proper length",
      category.metaTitle.length >= 1 && category.metaTitle.length <= 100,
    );
    await TestValidator.predicate(
      "category metaDescription has proper length",
      category.metaDescription.length >= 1 &&
        category.metaDescription.length <= 500,
    );
  }

  // Step 7: Verify hierarchical structure integrity
  TestValidator.predicate(
    "top category has no parent",
    topCategory.parent === undefined,
  );
  TestValidator.predicate(
    "mobile category has parent",
    mobileCategory.parent !== undefined,
  );
  TestValidator.equals(
    "mobile category parent is top category",
    mobileCategory.parent?.id,
    topCategory.id,
  );
}

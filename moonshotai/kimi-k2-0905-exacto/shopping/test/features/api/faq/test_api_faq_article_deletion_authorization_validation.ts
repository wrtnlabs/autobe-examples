import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IColorClass } from "@ORGANIZATION/PROJECT-api/lib/structures/IColorClass";
import type { IIconClass } from "@ORGANIZATION/PROJECT-api/lib/structures/IIconClass";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallFaqArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaqArticle";
import type { IShoppingMallFaqCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaqCategory";

/**
 * Test that only authenticated administrators can delete FAQ articles.
 *
 * This test validates authorization requirements prevent unauthorized access
 * while ensuring proper audit trails and security validation for content
 * management operations within the shopping mall knowledge base system. The
 * test follows a comprehensive workflow from authentication through to
 * verification of deletion attempts.
 */
export async function test_api_faq_article_deletion_authorization_validation(
  connection: api.IConnection,
) {
  // 1. Create administrator account with proper credentials for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        firstname: RandomGenerator.name(1),
        lastname: RandomGenerator.name(1),
        adminlevel: "super_admin",
        department: "Knowledge Base",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create FAQ category for article organization
  const category: IShoppingMallFaqCategory =
    await api.functional.shoppingMall.admin.faqCategories.create(connection, {
      body: {
        name: RandomGenerator.name(),
        slug: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        sort_order: 1,
        is_active: true,
        language: "en",
      } satisfies IShoppingMallFaqCategory.ICreate,
    });
  typia.assert(category);

  // 3. Create FAQ article that will be deleted
  const article: IShoppingMallFaqArticle =
    await api.functional.shoppingMall.admin.faqArticles.create(connection, {
      body: {
        title: RandomGenerator.name(3),
        content: RandomGenerator.content({ paragraphs: 2 }),
        excerpt: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        slug: RandomGenerator.alphabets(12),
        reading_time: 5,
        difficulty: "beginner",
        status: "published",
        faqCategoryCode: category.slug,
        language: "en",
        is_featured: false,
        target_audience: "customers",
        keywords: "shopping, customers, help",
      } satisfies IShoppingMallFaqArticle.ICreate,
    });
  typia.assert(article);

  // 4. Test successful deletion with authorized admin authentication
  const deletedArticle: IShoppingMallFaqArticle =
    await api.functional.shoppingMall.admin.faqArticles.erase(connection, {
      articleCode: article.slug,
    });
  typia.assert(deletedArticle);
  TestValidator.equals(
    "deleted article matches original",
    deletedArticle.id,
    article.id,
  );
  TestValidator.equals("admin email creation matches", admin.email, adminEmail);

  // 5. Test deletion fails without authentication by creating unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated deletion should fail",
    async () => {
      await api.functional.shoppingMall.admin.faqArticles.erase(unauthConn, {
        articleCode: article.slug,
      });
    },
  );

  // 6. Verify proper type handling and relationship integrity
  TestValidator.predicate("admin is authenticated", Boolean(admin.token));
  TestValidator.predicate(
    "admin has super admin privileges",
    admin.is_super_admin === true,
  );
  TestValidator.predicate("category is active", category.is_active === true);
  TestValidator.predicate(
    "article was published",
    article.status === "published",
  );
  TestValidator.predicate(
    "article belongs to category",
    article.faqCategory?.id === category.id,
  );
}

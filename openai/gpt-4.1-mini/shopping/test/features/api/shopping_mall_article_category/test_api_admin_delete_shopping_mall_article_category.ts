import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";

export async function test_api_admin_delete_shopping_mall_article_category(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword123!";
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.predicate("admin is active", admin.is_active);

  // 2. Create a shopping mall article category
  const categoryCreateBody = {
    name: `TestCategory_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 9,
    }),
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;

  const category: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.admin.shoppingMallArticleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category name matches",
    category.name,
    categoryCreateBody.name,
  );

  // 3. Delete the created article category
  await api.functional.shoppingMall.admin.shoppingMallArticleCategories.erase(
    connection,
    {
      shoppingMallArticleCategoryId: category.id,
    },
  );

  // NOTE:
  // After deletion, the category should no longer exist.
  // The test environment has no explicit category get API,
  // so this test confirms the delete call succeeded without errors.
  // Proper coverage of deletion side effects depends on additional API calls,
  // which are out of scope for this test due to material constraints.
}

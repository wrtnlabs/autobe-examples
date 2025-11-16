import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";

export async function test_api_shopping_mall_article_category_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user signs up (authenticate) to obtain token
  const adminCreateBody = {
    email: `admin.${RandomGenerator.alphaNumeric(5)}@example.com`,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create a shopping mall article category to update
  const categoryCreateBody = {
    name: `Category ${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;
  const createdCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.admin.shoppingMallArticleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(createdCategory);

  // 3. Update the article category with new attributes
  const categoryUpdateBody = {
    name: `Updated ${categoryCreateBody.name}`,
    description: `Updated description with ${RandomGenerator.paragraph({ sentences: 2 })}`,
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.IUpdate;

  const updatedCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.admin.shoppingMallArticleCategories.update(
      connection,
      {
        shoppingMallArticleCategoryId: createdCategory.id,
        body: categoryUpdateBody,
      },
    );
  typia.assert(updatedCategory);

  // 4. Validate that the updated attributes match and timestamps differ
  TestValidator.equals(
    "category id must be unchanged",
    updatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name should be updated",
    updatedCategory.name,
    categoryUpdateBody.name,
  );
  TestValidator.equals(
    "category description should be updated",
    updatedCategory.description,
    categoryUpdateBody.description,
  );

  // Validate created_at remains same
  TestValidator.equals(
    "category created_at unchanged",
    updatedCategory.created_at,
    createdCategory.created_at,
  );

  // Validate updated_at is non-null and different from created_at
  TestValidator.predicate(
    "category updated_at is not null",
    updatedCategory.updated_at !== null &&
      updatedCategory.updated_at !== undefined,
  );
  TestValidator.predicate(
    "category updated_at is different from created_at",
    updatedCategory.updated_at !== createdCategory.created_at,
  );
}

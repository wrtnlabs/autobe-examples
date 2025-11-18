import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function test_api_public_category_retrieval_soft_deleted(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorization context for admin-only category APIs.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an active category via admin endpoint.
  const createCategoryBody = {
    parent_id: null,
    slug: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    name_en: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }),
    description_en: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createCategoryBody,
    });
  typia.assert<IShoppingMallCategory>(createdCategory);

  // Ensure the category is initially retrievable via public endpoint.
  const publicFetchedBeforeDelete: IShoppingMallCategory =
    await api.functional.shoppingMall.categories.at(connection, {
      categoryId: createdCategory.id,
    });
  typia.assert<IShoppingMallCategory>(publicFetchedBeforeDelete);
  TestValidator.equals(
    "public category fetch before delete returns the created category",
    publicFetchedBeforeDelete.id,
    createdCategory.id,
  );

  // 3. Delete the category through admin API.
  await api.functional.shoppingMall.admin.categories.erase(connection, {
    categoryId: createdCategory.id,
  });

  // 4. Call the public GET endpoint again and expect it to fail with HttpError
  //    indicating that the category is no longer visible.
  await TestValidator.error(
    "public category fetch after admin delete should fail (category not visible)",
    async () => {
      await api.functional.shoppingMall.categories.at(connection, {
        categoryId: createdCategory.id,
      });
    },
  );
}

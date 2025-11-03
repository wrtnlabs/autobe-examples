import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_product_category_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins (register/admin creation)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "strongPassword123",
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin creates a product category to be deleted
  const createBody = {
    parent_id: null,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 2,
      wordMax: 6,
    }),
  } satisfies IShoppingMallProductCategory.ICreate;

  const newCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(newCategory);

  // 3. Admin deletes the created product category
  await api.functional.shoppingMall.admin.productCategories.erase(connection, {
    id: newCategory.id,
  });

  // No retrieval API is documented to confirm deletion, so the test ends here
}

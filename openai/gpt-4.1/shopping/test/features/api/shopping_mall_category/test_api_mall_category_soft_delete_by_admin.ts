import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function test_api_mall_category_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (authentication and admin context)
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Simulate presence of a category by inventing a name (since there are no create/list APIs)
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  }).replace(/ /g, "-");
  // 3. Attempt to soft-delete the category (erase by name)
  const output1: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.mallCategories.erase(connection, {
      name: categoryName,
    });
  typia.assert(output1);
  TestValidator.predicate(
    "deleted_at should be non-null after soft delete",
    output1.deleted_at !== null && output1.deleted_at !== undefined,
  );
  TestValidator.equals(
    "category name matches input",
    output1.name,
    categoryName,
  );

  // 4. Repeated soft-delete should error
  await TestValidator.error(
    "soft deleting already-deleted category throws error",
    async () => {
      await api.functional.shoppingMall.admin.mallCategories.erase(connection, {
        name: categoryName,
      });
    },
  );
}

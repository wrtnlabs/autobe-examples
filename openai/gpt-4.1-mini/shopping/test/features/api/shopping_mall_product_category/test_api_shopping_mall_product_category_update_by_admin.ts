import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_shopping_mall_product_category_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "Password123!",
    phone_number: RandomGenerator.mobile(),
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a product category
  const categoryCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallProductCategory.ICreate;

  const category: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.shoppingMallProductCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 3. Update the created category with new values
  // Prepare update body - partial to simulate typical update use
  const updateBody: IShoppingMallProductCategory.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    deleted_at: new Date().toISOString(),
    version: category.version, // specify version for optimistic locking
  };

  const updatedCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.shoppingMallProductCategories.update(
      connection,
      {
        categoryCode: category.code,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);

  // Validate that update contains expected changes
  TestValidator.equals(
    "updated category name should match",
    updatedCategory.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated category description should match",
    updatedCategory.description,
    updateBody.description,
  );

  const deletedAt = updatedCategory.deleted_at;
  TestValidator.predicate(
    "deleted_at should be ISO8601 string",
    typeof deletedAt === "string" && deletedAt.length > 0,
  );

  TestValidator.equals(
    "category code should be unchanged",
    updatedCategory.code,
    category.code,
  );

  // 4. Confirm unauthorized update attempt is rejected
  // Make unauthenticated or unauthorized connection
  const noAuthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.shoppingMall.admin.shoppingMallProductCategories.update(
      noAuthConnection,
      {
        categoryCode: category.code,
        body: updateBody,
      },
    );
  });
}

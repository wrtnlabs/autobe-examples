import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_shopping_mall_product_category_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "1234";
  const adminName = RandomGenerator.name();
  const adminRoleChoices = ["superadmin", "admin", "support"] as const;
  const adminRole = RandomGenerator.pick(adminRoleChoices);

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: adminName,
        password: adminPassword,
        role: adminRole,
        phone_number: null,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new shopping mall product category
  const categoryCode = `CATEGORY-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const categoryName = RandomGenerator.name();
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const createdCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.shoppingMallProductCategories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: categoryName,
          description: categoryDescription,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Validate that created category matches input data
  TestValidator.equals(
    "category code should match",
    createdCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "category name should match",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category description should match",
    createdCategory.description,
    categoryDescription,
  );

  // 3. Retrieve the created category by its unique category code
  const retrievedCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.shoppingMallProductCategories.at(
      connection,
      {
        categoryCode: categoryCode,
      },
    );
  typia.assert(retrievedCategory);

  // Validate that retrieved category matches the created category
  TestValidator.equals(
    "retrieved category id matches created",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "retrieved category code matches created",
    retrievedCategory.code,
    createdCategory.code,
  );
  TestValidator.equals(
    "retrieved category name matches created",
    retrievedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "retrieved category description matches created",
    retrievedCategory.description,
    createdCategory.description,
  );
}

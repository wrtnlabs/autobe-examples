import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_shopping_mall_product_category_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "SecurePass123!",
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a product category as admin
  const categoryCode: string = RandomGenerator.alphaNumeric(8);
  const categoryName: string = RandomGenerator.name(2);
  const category: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.shoppingMallProductCategories.create(
      connection,
      {
        body: {
          code: categoryCode,
          name: categoryName,
          description: null,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(category);

  TestValidator.equals("category code matches", category.code, categoryCode);
  TestValidator.equals("category name matches", category.name, categoryName);

  // 3. Delete the product category
  await api.functional.shoppingMall.admin.shoppingMallProductCategories.erase(
    connection,
    {
      categoryCode: categoryCode,
    },
  );

  // 4. Verify category is deleted properly
  // Try deleting again should cause error
  await TestValidator.error(
    "deleting non-existent category should fail",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallProductCategories.erase(
        connection,
        {
          categoryCode: categoryCode,
        },
      );
    },
  );

  // 5. Confirm deletion without admin auth is rejected - create unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated deletion should be rejected",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallProductCategories.erase(
        unauthenticatedConnection,
        {
          categoryCode: categoryCode,
        },
      );
    },
  );
}

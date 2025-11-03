import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

export async function test_api_product_category_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Aa1!" + RandomGenerator.alphaNumeric(10);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Prepare product category create info
  const categoryName = `test_category_${RandomGenerator.alphaNumeric(6)}`;
  const categoryDescription = RandomGenerator.paragraph({ sentences: 4 });
  const requestBody = {
    parent_id: null,
    name: categoryName,
    description: categoryDescription,
  } satisfies IShoppingMallProductCategory.ICreate;

  // 3. Create a new product category as admin
  const createdCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.create(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(createdCategory);

  // 4. Validate returned data
  TestValidator.predicate(
    "createdCategory has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdCategory.id,
    ),
  );
  TestValidator.equals(
    "createdCategory parent_id is null",
    createdCategory.parent_id,
    null,
  );
  TestValidator.equals(
    "createdCategory name matches input",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "createdCategory description matches input",
    createdCategory.description,
    categoryDescription,
  );
  TestValidator.predicate(
    "createdCategory created_at is ISO string",
    typeof createdCategory.created_at === "string" &&
      createdCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "createdCategory updated_at is ISO string",
    typeof createdCategory.updated_at === "string" &&
      createdCategory.updated_at.length > 0,
  );
  TestValidator.equals(
    "createdCategory deleted_at is null or undefined",
    createdCategory.deleted_at ?? null,
    null,
  );

  // 5. Attempt unauthorized creation with empty connection
  const emptyConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized category creation should fail",
    async () => {
      await api.functional.shoppingMall.admin.productCategories.create(
        emptyConn,
        {
          body: requestBody,
        },
      );
    },
  );
}

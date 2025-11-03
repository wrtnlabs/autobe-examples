import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_product_category_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller signs up and authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "ValidPassword123!",
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Create a product category with unique name and optional description
  const categoryName = `${RandomGenerator.name(1)} Category`;
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  const newCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.seller.productCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
          parent_id: null,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(newCategory);

  // 3. Basic validation of returned category
  TestValidator.predicate(
    "new category ID is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      newCategory.id,
    ),
  );
  TestValidator.equals("category name matches", newCategory.name, categoryName);
  TestValidator.equals(
    "category description matches",
    newCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category parent_id is null",
    newCategory.parent_id,
    null,
  );

  // 4. Validate timestamps are reasonable ISO strings
  TestValidator.predicate(
    "created_at is ISO 8601",
    !!new Date(newCategory.created_at).toISOString() &&
      typeof newCategory.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    !!new Date(newCategory.updated_at).toISOString() &&
      typeof newCategory.updated_at === "string",
  );

  // 5. Validate that deleted_at is null (active category)
  TestValidator.equals("deleted_at is null", newCategory.deleted_at, null);

  // 6. Attempt to create a category with duplicate name under the same parent to test uniqueness enforcement
  await TestValidator.error(
    "duplicate category name should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.productCategories.create(
        connection,
        {
          body: {
            name: categoryName,
            description: "Duplicate category description",
            parent_id: null,
          } satisfies IShoppingMallProductCategory.ICreate,
        },
      );
    },
  );

  // 7. Test creating a category without authentication fails (simulate unauthenticated connection)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized create category should fail",
    async () => {
      await api.functional.shoppingMall.seller.productCategories.create(
        unauthenticatedConn,
        {
          body: {
            name: `${RandomGenerator.name(1)} Unauthorized Category`,
            description: null,
            parent_id: null,
          } satisfies IShoppingMallProductCategory.ICreate,
        },
      );
    },
  );
}

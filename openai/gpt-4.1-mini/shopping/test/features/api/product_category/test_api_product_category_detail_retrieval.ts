import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_product_category_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Seller registers (join) to authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "P@ssword123",
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Create a product category for the seller
  const categoryName = RandomGenerator.name(2);
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.seller.productCategories.create(
      connection,
      {
        body: {
          parent_id: null, // top-level category
          name: categoryName,
          description: categoryDescription,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productCategory);

  // 3. Retrieve product category details by its id
  const retrievedCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.seller.productCategories.at(connection, {
      id: productCategory.id,
    });
  typia.assert(retrievedCategory);

  // Verify that retrieved category matches created category
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    productCategory.name,
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    productCategory.description,
  );

  // Check nullable properties are explicitly handled
  if (
    retrievedCategory.parent_id === null ||
    retrievedCategory.parent_id === undefined
  ) {
    TestValidator.predicate(
      "parent_id is null or undefined",
      retrievedCategory.parent_id === null ||
        retrievedCategory.parent_id === undefined,
    );
  } else {
    typia.assert(retrievedCategory.parent_id);
  }

  // Check timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof retrievedCategory.created_at === "string" &&
      retrievedCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof retrievedCategory.updated_at === "string" &&
      retrievedCategory.updated_at.length > 0,
  );

  // deleted_at can be null or undefined
  if (
    retrievedCategory.deleted_at !== null &&
    retrievedCategory.deleted_at !== undefined
  ) {
    typia.assert(retrievedCategory.deleted_at);
  }

  // 4. Attempt retrieval of a non-existent ID to verify error behavior
  await TestValidator.error(
    "invalid product category ID retrieval should fail",
    async () => {
      await api.functional.shoppingMall.seller.productCategories.at(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}

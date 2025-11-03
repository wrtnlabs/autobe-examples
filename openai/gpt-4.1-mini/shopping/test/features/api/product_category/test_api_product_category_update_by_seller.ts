import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_product_category_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller signs up
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    store_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // 2. Seller creates a top-level product category
  const categoryCreate1 = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    parent_id: null,
  } satisfies IShoppingMallProductCategory.ICreate;

  const category1: IShoppingMallProductCategory =
    await api.functional.shoppingMall.seller.productCategories.create(
      connection,
      {
        body: categoryCreate1,
      },
    );
  typia.assert(category1);

  // 3. Seller creates a second top-level product category, sibling of first
  const categoryCreate2 = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    parent_id: null,
  } satisfies IShoppingMallProductCategory.ICreate;

  const category2: IShoppingMallProductCategory =
    await api.functional.shoppingMall.seller.productCategories.create(
      connection,
      {
        body: categoryCreate2,
      },
    );
  typia.assert(category2);

  // 4. Seller updates the first category's name and description
  // Change name to a new unique string among sibling categories.
  const newCategoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 12,
  });
  const newCategoryDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 8,
  });

  const updateBody1 = {
    name: newCategoryName,
    description: newCategoryDescription,
    parent_id: null,
  } satisfies IShoppingMallProductCategory.IUpdate;

  const updatedCategory1: IShoppingMallProductCategory =
    await api.functional.shoppingMall.seller.productCategories.update(
      connection,
      {
        id: category1.id,
        body: updateBody1,
      },
    );
  typia.assert(updatedCategory1);

  TestValidator.equals(
    "updated category ID",
    updatedCategory1.id,
    category1.id,
  );
  TestValidator.equals(
    "updated category name",
    updatedCategory1.name,
    newCategoryName,
  );
  TestValidator.equals(
    "updated category description",
    updatedCategory1.description,
    newCategoryDescription,
  );
  TestValidator.equals(
    "parent_id remains null",
    updatedCategory1.parent_id,
    null,
  );

  // 5. Attempt invalid update: change second category's name to duplicate of first
  // Should throw error due to unique sibling name constraint
  await TestValidator.error(
    "duplicate sibling category name should fail",
    async () => {
      await api.functional.shoppingMall.seller.productCategories.update(
        connection,
        {
          id: category2.id,
          body: {
            name: newCategoryName, // same as updated first category
            description: category2.description ?? null,
            parent_id: null,
          } satisfies IShoppingMallProductCategory.IUpdate,
        },
      );
    },
  );

  // 6. Create a third category as child of updated first category
  const categoryCreateChild = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    parent_id: updatedCategory1.id,
  } satisfies IShoppingMallProductCategory.ICreate;

  const categoryChild: IShoppingMallProductCategory =
    await api.functional.shoppingMall.seller.productCategories.create(
      connection,
      {
        body: categoryCreateChild,
      },
    );
  typia.assert(categoryChild);

  // 7. Update the child category: change its name and move it to be child of second category

  const newChildName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 11,
  });
  const updateChildBody = {
    name: newChildName,
    description: categoryChild.description ?? null,
    parent_id: category2.id,
  } satisfies IShoppingMallProductCategory.IUpdate;

  const updatedChildCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.seller.productCategories.update(
      connection,
      {
        id: categoryChild.id,
        body: updateChildBody,
      },
    );
  typia.assert(updatedChildCategory);

  TestValidator.equals(
    "updated child category ID",
    updatedChildCategory.id,
    categoryChild.id,
  );
  TestValidator.equals(
    "updated child category name",
    updatedChildCategory.name,
    newChildName,
  );
  TestValidator.equals(
    "updated child category parent_id",
    updatedChildCategory.parent_id,
    category2.id,
  );

  // 8. All asserts passed. End of test for update by seller with validation.
}

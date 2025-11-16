import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * This test validates the workflow of updating a shopping mall article category
 * by a seller.
 *
 * The business context: A seller must be authenticated to perform operations on
 * shopping mall entities. Therefore, the test begins by joining as a seller to
 * obtain authorization. Next, the seller creates an article category that
 * serves as the target for the update. Finally, the test updates the category's
 * name, description, and parent category. Validation asserts that the updates
 * are properly reflected in the API's response.
 *
 * This test ensures authentication, creation, modification, and validation
 * steps of article category management operate correctly and respect schema
 * constraints. It uses realistic random data generators and strict type safety
 * with typia.
 *
 * Steps:
 *
 * 1. Authenticate as a seller via join endpoint.
 * 2. Create a new article category as prerequisite data.
 * 3. Update the created article category with new data.
 * 4. Validate that the update response accurately reflects changes.
 *
 * All API calls are awaited, and responses are asserted for correct typing and
 * schema conformity. Null handling and optional fields follow explicit null
 * assignment policy to ensure accurate schema compliance.
 */
export async function test_api_shopping_mall_article_category_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller join to authenticate.
  const sellerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerBody });
  typia.assert(seller);

  // 2. Prerequisite: create an article category as the seller.
  const categoryCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 12,
    }),
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;

  const createdCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.seller.shoppingMallArticleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(createdCategory);

  // 3. Update the created category with new valid values.
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 15 }),
    description: null, // Explicit null reset to remove description
    parent_id: null, // Explicit: keep as root category
  } satisfies IShoppingMallArticleCategory.IUpdate;

  const updatedCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.seller.shoppingMallArticleCategories.update(
      connection,
      {
        shoppingMallArticleCategoryId: createdCategory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);

  // 4. Confirm that the updates have been applied correctly.
  TestValidator.equals(
    "updated category id",
    updatedCategory.id,
    createdCategory.id,
  );

  TestValidator.equals(
    "updated category name",
    updatedCategory.name,
    updateBody.name,
  );

  TestValidator.equals(
    "updated category description",
    updatedCategory.description,
    updateBody.description,
  );

  TestValidator.equals(
    "updated category parent id",
    updatedCategory.parent_id,
    updateBody.parent_id,
  );
}

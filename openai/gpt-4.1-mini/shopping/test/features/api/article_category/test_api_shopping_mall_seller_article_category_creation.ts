import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the creation of a shopping mall article category by a seller.
 *
 * This E2E test performs the following steps:
 *
 * 1. Seller signs up through the join endpoint to get authorized identity.
 * 2. Seller creates a top-level article category with a unique name and
 *    description.
 * 3. Verify the created category has all required properties and correct value
 *    types.
 * 4. Seller creates a sub-category with a parent_id referencing the previous
 *    category.
 * 5. Verify the sub-category's parent_id matches the parent's id and all other
 *    properties.
 */
export async function test_api_shopping_mall_seller_article_category_creation(
  connection: api.IConnection,
) {
  // 1. Seller signs up to get authorization
  const sellerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!", // a valid password
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerCreate });
  typia.assert(seller);

  // 2. Create a top-level article category without a parent
  const topCategoryCreate = {
    name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }).slice(0, 100),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 15,
    }),
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;
  const topCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.seller.shoppingMallArticleCategories.create(
      connection,
      { body: topCategoryCreate },
    );
  typia.assert(topCategory);
  TestValidator.predicate(
    "top-category id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      topCategory.id,
    ),
  );
  TestValidator.equals(
    "top-category name",
    topCategory.name,
    topCategoryCreate.name,
  );
  TestValidator.equals(
    "top-category description",
    topCategory.description,
    topCategoryCreate.description,
  );
  TestValidator.equals("top-category parent_id", topCategory.parent_id, null);
  TestValidator.predicate(
    "top-category created_at exists",
    topCategory.created_at !== null && topCategory.created_at !== undefined,
  );

  // 3. Create a sub-category with parent_id = topCategory.id
  const subCategoryCreate = {
    name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }).slice(0, 100),
    description: null,
    parent_id: topCategory.id,
  } satisfies IShoppingMallArticleCategory.ICreate;
  const subCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.seller.shoppingMallArticleCategories.create(
      connection,
      { body: subCategoryCreate },
    );
  typia.assert(subCategory);
  TestValidator.equals(
    "sub-category name",
    subCategory.name,
    subCategoryCreate.name,
  );
  TestValidator.equals(
    "sub-category description",
    subCategory.description,
    null,
  );
  TestValidator.equals(
    "sub-category parent_id",
    subCategory.parent_id,
    topCategory.id,
  );
  TestValidator.predicate(
    "sub-category created_at exists",
    subCategory.created_at !== null && subCategory.created_at !== undefined,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

/**
 * This test function validates the 'list child categories by parentId' feature.
 *
 * It covers:
 *
 * 1. Admin signup/authentication
 * 2. Creation of a parent product category
 * 3. Creation of multiple child categories under the parent category
 * 4. Retrieval of the paginated child categories list under the parent category
 * 5. Verifications that the returned categories are immediate children of the
 *    specified parent
 * 6. Pagination and filtering checks
 */
export async function test_api_product_category_list_children_by_parentid(
  connection: api.IConnection,
) {
  // 1. Admin join and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "secureP@ssw0rd",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create parent product category
  const parentCategoryCreate: IShoppingMallProductCategory.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 7,
    }),
  } satisfies IShoppingMallProductCategory.ICreate;

  const parentCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.productCategories.create(
      connection,
      {
        body: parentCategoryCreate,
      },
    );
  typia.assert(parentCategory);

  // 3. Create multiple child categories under the parent
  const childCount = (RandomGenerator.alphaNumeric(1).length % 3) + 3; // between 3~5 children
  const createdChildren: IShoppingMallProductCategory[] = [];

  for (let i = 0; i < childCount; ++i) {
    const childCreate: IShoppingMallProductCategory.ICreate = {
      name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
      description: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 7,
        wordMin: 3,
        wordMax: 6,
      }),
      parent_id: parentCategory.id,
    } satisfies IShoppingMallProductCategory.ICreate;

    const child =
      await api.functional.shoppingMall.admin.productCategories.children.createChildCategory(
        connection,
        {
          parentId: parentCategory.id,
          body: childCreate,
        },
      );
    typia.assert(child);
    createdChildren.push(child);
  }

  // 4. Request paginated list of children with filter
  const requestBody: IShoppingMallProductCategory.IRequest = {
    page: 1,
    limit: 10,
    filter_parent_id: parentCategory.id,
  };

  const pagedChildren: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.productCategories.children.index(
      connection,
      {
        parentId: parentCategory.id,
        body: requestBody,
      },
    );
  typia.assert(pagedChildren);

  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    pagedChildren.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit",
    pagedChildren.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "pagination records count matches child count",
    pagedChildren.pagination.records >= createdChildren.length,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    pagedChildren.pagination.pages >= 1,
  );

  // 6. Validate each child category
  for (const category of pagedChildren.data) {
    typia.assert(category);
    TestValidator.equals(
      `child category parent_id matches parent category id for category ${category.id}`,
      category.parent_id ?? null,
      parentCategory.id,
    );
    const found = createdChildren.find((child) => child.id === category.id);
    TestValidator.predicate(
      `child category id ${category.id} found in created children`,
      found !== undefined,
    );
  }
}

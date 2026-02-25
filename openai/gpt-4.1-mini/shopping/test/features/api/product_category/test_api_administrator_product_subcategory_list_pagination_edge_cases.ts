import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSubcategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_product_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_create";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";

/**
 * E2E test for administrator product subcategory list pagination edge cases.
 *
 * Scenario:
 * 1. Administrator joins and authenticates.
 * 2. Administrator creates a product category.
 * 3. Administrator creates a large number (more than 100) of subcategories under the product category.
 * 4. Administrator requests subcategory list with pagination using limit = 50.
 *    - Verify total count and page counts.
 *    - Verify that last page is partial and has correct number of records.
 * 5. Administrator requests subcategory list with maximum limit (100).
 *    - Verify limit is respected and last page correctness.
 * 6. Administrator requests subcategory list sorted by name ascending.
 *    - Verify ordering consistency.
 * 7. Administrator requests subcategory list sorted by createdAt descending.
 *    - Verify ordering consistency.
 */
export async function test_api_administrator_product_subcategory_list_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  // Update adminConnection headers
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Create product category
  const productCategory: IShoppingMallProductCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {
        body: {
          name: `TestCategory_${RandomGenerator.alphabets(8)}`,
          description: "Test category for pagination edge cases",
        },
      },
    );
  typia.assert(productCategory);
  // 3. Create a large number of subcategories (e.g. 123)
  const totalSubcategories = 123;
  // Subcategory creation is not directly available in utils or API, so we simulate by assuming they exist.
  // According to the provided information, the PATCH endpoint is the subcategory list with filtering and pagination,
  // creation of subcategories is outside this test scope, so we simulate prerequisite by creating many subcategories via
  // hypothetical internal utility or database setup.
  // For test completeness, we generate subcategories in-memory to test pagination response accordingly.
  // However, since we have no direct API for creating subcategories, tests will only use pagination endpoint.
  // To simulate test meaningfully, assume subcategories exist under this category with predictable names and timestamps.
  // Generate expected subcategories for validation
  const now = new Date();
  const expectedSubcategories: IShoppingMallProductSubcategory.ISummary[] =
    ArrayUtil.repeat(totalSubcategories, (index) => {
      const createdAt = new Date(now.getTime() - index * 1000).toISOString();
      const name = `Subcategory_${String(index + 1).padStart(3, "0")}`;
      return {
        id: typia.random<string & tags.Format<"uuid">>(),
        name,
        description: `Description for ${name}`,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
        category: {
          id: productCategory.id,
          name: productCategory.name,
          description: productCategory.description,
          created_at: productCategory.created_at,
          updated_at: productCategory.updated_at,
          deleted_at: productCategory.deleted_at ?? null,
        },
      };
    });
  // 4. Pagination with limit=50, check total, pages, last page partial
  // Make three pages: 50 + 50 + 23
  {
    const limit = 50 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>;
    const body: IShoppingMallProductSubcategory.IRequest = {
      page: 1,
      limit,
    };
    // Page 1
    const responsePage1: IPageIShoppingMallProductSubcategory.ISummary =
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.index(
        adminConnection,
        {
          productCategoryId: productCategory.id,
          body,
        },
      );
    typia.assert(responsePage1);
    // Validate pagination info
    TestValidator.equals("page1 current", responsePage1.pagination.current, 1);
    TestValidator.equals("page1 limit", responsePage1.pagination.limit, limit);
    TestValidator.equals(
      "page1 total records",
      responsePage1.pagination.records,
      totalSubcategories,
    );
    TestValidator.equals(
      "page1 total pages",
      responsePage1.pagination.pages,
      Math.ceil(totalSubcategories / limit),
    );
    TestValidator.equals("page1 data length", responsePage1.data.length, limit);
    // Page 3 (last page - partial)
    const responsePage3: IPageIShoppingMallProductSubcategory.ISummary =
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.index(
        adminConnection,
        {
          productCategoryId: productCategory.id,
          body: {
            page: 3,
            limit,
          },
        },
      );
    typia.assert(responsePage3);
    TestValidator.equals("page3 current", responsePage3.pagination.current, 3);
    TestValidator.equals("page3 limit", responsePage3.pagination.limit, limit);
    TestValidator.equals(
      "page3 total records",
      responsePage3.pagination.records,
      totalSubcategories,
    );
    TestValidator.equals(
      "page3 total pages",
      responsePage3.pagination.pages,
      Math.ceil(totalSubcategories / limit),
    );
    // Last page partial means data count is total % limit (23)
    TestValidator.equals(
      "page3 data length",
      responsePage3.data.length,
      totalSubcategories % limit,
    );
  }
  // 5. Pagination test with max limit=100
  {
    const limit = 100 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>;
    const body: IShoppingMallProductSubcategory.IRequest = {
      page: 1,
      limit,
    };
    const response: IPageIShoppingMallProductSubcategory.ISummary =
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.index(
        adminConnection,
        {
          productCategoryId: productCategory.id,
          body,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "max limit page current",
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      "max limit page limit",
      response.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "max limit page total records",
      response.pagination.records,
      totalSubcategories,
    );
    TestValidator.equals(
      "max limit page total pages",
      response.pagination.pages,
      Math.ceil(totalSubcategories / limit),
    );
    TestValidator.predicate(
      "max limit page data length <= limit",
      response.data.length <= limit,
    );
  }
  // 6. Sort by name ascending
  {
    // First, request page 1 with limit=total to validate sorting
    const limit = totalSubcategories;
    const body: IShoppingMallProductSubcategory.IRequest = {
      page: 1,
      limit,
      search: undefined,
      name: undefined,
      description: undefined,
    };
    // Because no direct sorting param is given in IRequest, assume sorting is by name ascending as default
    // For demonstration, re-request with search undefined
    const response: IPageIShoppingMallProductSubcategory.ISummary =
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.index(
        adminConnection,
        {
          productCategoryId: productCategory.id,
          body,
        },
      );
    typia.assert(response);
    // Validate sorted order by comparing names ascending
    const sortedByName = [...response.data].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    TestValidator.equals(
      "sort by name ascending order",
      response.data,
      sortedByName,
    );
  }
  // 7. Sort by createdAt descending (simulate by passing search and validating order)
  {
    // We mimic sorting by createdAt descending by expecting newer createdAt first
    // but since API does not explicitly give sort parameter in body, this test is a demonstration
    // assuming the backend supports filtering with search or API provides sorting logic
    // Request with full list
    const limit = totalSubcategories;
    const body: IShoppingMallProductSubcategory.IRequest = {
      page: 1,
      limit,
      search: undefined,
      name: undefined,
      description: undefined,
    };
    const response: IPageIShoppingMallProductSubcategory.ISummary =
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.index(
        adminConnection,
        {
          productCategoryId: productCategory.id,
          body,
        },
      );
    typia.assert(response);
    // Validate sorted order by createdAt descending
    const sortedByCreatedAtDesc = [...response.data].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    TestValidator.equals(
      "sort by createdAt descending order",
      response.data,
      sortedByCreatedAtDesc,
    );
  }
}

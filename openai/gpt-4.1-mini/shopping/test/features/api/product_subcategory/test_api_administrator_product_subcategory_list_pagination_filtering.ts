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

export async function test_api_administrator_product_subcategory_list_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving paginated product subcategories list with filters for administrator
  // 1. Administrator join (register and authenticate)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminpassword123",
    },
  });
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Create a parent product category (prerequisite for subcategory listing)
  const productCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(productCategory);
  // 3. Initially request subcategories for the new category - expect empty list
  let subcategoryRequestBody: IShoppingMallProductSubcategory.IRequest = {
    page: 1,
    limit: 10,
  };
  let subcategoryList =
    await api.functional.shoppingMall.administrator.productCategories.productSubcategories.index(
      adminConnection,
      {
        productCategoryId: productCategory.id,
        body: subcategoryRequestBody,
      },
    );
  typia.assert(subcategoryList);
  // Validate empty results initially
  TestValidator.equals(
    "empty subcategory list",
    subcategoryList.data.length,
    0,
  );
  // 4. Test paginated retrieval with page=1, limit=10 without filters
  subcategoryRequestBody = {
    page: 1,
    limit: 10,
  };
  subcategoryList =
    await api.functional.shoppingMall.administrator.productCategories.productSubcategories.index(
      adminConnection,
      {
        productCategoryId: productCategory.id,
        body: subcategoryRequestBody,
      },
    );
  typia.assert(subcategoryList);
  TestValidator.predicate(
    "pagination data length less or equal to limit",
    subcategoryList.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination limit equals requested limit",
    subcategoryList.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination current page equals 1",
    subcategoryList.pagination.current === 1,
  );
  // 5. Test paginated retrieval with page=2 if pages > 1
  if (subcategoryList.pagination.pages >= 2) {
    subcategoryRequestBody.page = 2;
    subcategoryList =
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.index(
        adminConnection,
        {
          productCategoryId: productCategory.id,
          body: subcategoryRequestBody,
        },
      );
    typia.assert(subcategoryList);
    TestValidator.equals(
      "pagination current page equals 2",
      subcategoryList.pagination.current,
      2,
    );
  }
  // 6. Test search filter "search" with a substring if there are any subcategories
  if (subcategoryList.data.length > 0) {
    const searchTerm = subcategoryList.data[0].name.substring(0, 3);
    subcategoryRequestBody = {
      search: searchTerm,
      page: 1,
      limit: 10,
    };
    subcategoryList =
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.index(
        adminConnection,
        {
          productCategoryId: productCategory.id,
          body: subcategoryRequestBody,
        },
      );
    typia.assert(subcategoryList);
    for (const subcategory of subcategoryList.data) {
      TestValidator.predicate(
        `search result has '${searchTerm}' in name or description: ${subcategory.name}`,
        subcategory.name.includes(searchTerm) ||
          subcategory.description.includes(searchTerm),
      );
    }
  }
  // 7. Test filtering by exact name and description if data exists
  if (subcategoryList.data.length > 0) {
    const exactSubcategory = subcategoryList.data[0];
    subcategoryRequestBody = {
      name: exactSubcategory.name,
      description: exactSubcategory.description,
      page: 1,
      limit: 10,
    };
    subcategoryList =
      await api.functional.shoppingMall.administrator.productCategories.productSubcategories.index(
        adminConnection,
        {
          productCategoryId: productCategory.id,
          body: subcategoryRequestBody,
        },
      );
    typia.assert(subcategoryList);
    TestValidator.predicate(
      "filtered result have requested exact name and description",
      subcategoryList.data.every(
        (sub) =>
          sub.name === exactSubcategory.name &&
          sub.description === exactSubcategory.description,
      ),
    );
  }
  // 8. Unauthorized access test: try accessing with a fresh connection without authentication header
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.shoppingMall.administrator.productCategories.productSubcategories.index(
      unauthorizedConnection,
      {
        productCategoryId: productCategory.id,
        body: { page: 1, limit: 5 },
      },
    );
  });
}

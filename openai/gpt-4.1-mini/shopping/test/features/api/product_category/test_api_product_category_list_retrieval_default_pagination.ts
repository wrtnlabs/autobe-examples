import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_category_list_retrieval_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup: Join and gain authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2. Retrieve list of product categories with default pagination (no parameters)
  const defaultList =
    await api.functional.shoppingMall.administrator.productCategories.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(defaultList);
  // 3. Validate pagination metadata and data list
  const { pagination, data } = defaultList;
  // Pagination basic checks
  TestValidator.predicate(
    "pagination current page should be >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be >= 1 and <= 100",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination pages calculation",
    Math.ceil(pagination.records / pagination.limit),
    pagination.pages,
  );
  // 4. Validate each product category item fields
  for (const category of data) {
    typia.assert(category);
    TestValidator.predicate(
      `category id is UUID length 36`,
      typeof category.id === "string" && category.id.length === 36,
    );
    TestValidator.predicate(
      `category name is non-empty string`,
      typeof category.name === "string" && category.name.length > 0,
    );
    TestValidator.predicate(
      `category description is string`,
      typeof category.description === "string",
    );
    TestValidator.predicate(
      `category created_at is ISO string with length > 0`,
      typeof category.created_at === "string" && category.created_at.length > 0,
    );
    TestValidator.predicate(
      `category updated_at is ISO string with length >= 0`,
      typeof category.updated_at === "string" && category.updated_at.length > 0,
    );
    // deleted_at can be null or string
    TestValidator.predicate(
      `category deleted_at is string or null`,
      category.deleted_at === null ||
        (typeof category.deleted_at === "string" &&
          category.deleted_at.length > 0),
    );
  }
  // 5. If there are multiple pages, fetch second page to validate pagination correctness
  if (pagination.pages > 1) {
    const secondPageList =
      await api.functional.shoppingMall.administrator.productCategories.index(
        adminConnection,
        { body: { page: 2 } },
      );
    typia.assert(secondPageList);
    TestValidator.equals(
      "second page current equals 2",
      secondPageList.pagination.current,
      2,
    );
  }
}

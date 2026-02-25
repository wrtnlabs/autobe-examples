import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_product_subcategory_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test that an authenticated administrator can fetch product subcategory details by valid productCategoryId and subcategoryId, and handle 404 errors for non-existent subcategory or category IDs.
  // 1. Administrator join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Prepare random valid UUIDs for category and subcategory
  const validCategoryId = typia.random<string & tags.Format<"uuid">>();
  const validSubcategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve subcategory with valid IDs (mocked) and validate response structure
  const subcategory =
    await api.functional.shoppingMall.administrator.product_categories.subcategories.at(
      adminConnection,
      {
        productCategoryId: validCategoryId,
        subcategoryId: validSubcategoryId,
      },
    );
  typia.assert(subcategory);
  // Validate fields
  TestValidator.predicate(
    "subcategory.id is valid uuid",
    /^[0-9a-fA-F-]{36}$/.test(subcategory.id),
  );
  TestValidator.predicate(
    "subcategory.name is non-empty",
    subcategory.name.length > 0,
  );
  TestValidator.predicate(
    "subcategory.description is non-empty",
    subcategory.description.length > 0,
  );
  typia.assert(subcategory.category);
  TestValidator.predicate(
    "category.id is valid uuid",
    /^[0-9a-fA-F-]{36}$/.test(subcategory.category.id),
  );
  TestValidator.predicate(
    "subcategory.createdAt is present",
    typeof subcategory.createdAt === "string",
  );
  TestValidator.predicate(
    "subcategory.updatedAt is present",
    typeof subcategory.updatedAt === "string",
  );
  TestValidator.predicate(
    "subcategory.deletedAt is null or string",
    subcategory.deletedAt === null || typeof subcategory.deletedAt === "string",
  );
  // 4. Test 404 error when subcategory does not exist
  const invalidSubcategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 error on non-existent subcategory",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.product_categories.subcategories.at(
        adminConnection,
        {
          productCategoryId: validCategoryId,
          subcategoryId: invalidSubcategoryId,
        },
      );
    },
  );
  // 5. Test 404 error when category does not exist
  const invalidCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 error on non-existent category",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.product_categories.subcategories.at(
        adminConnection,
        {
          productCategoryId: invalidCategoryId,
          subcategoryId: validSubcategoryId,
        },
      );
    },
  );
}

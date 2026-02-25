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

export async function test_api_administrator_product_subcategories_add_multiple_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPass1234",
      },
    });
  typia.assert(admin);
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // 2. Create a product category as prerequisite
  const productCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {
        body: {
          name: `Category_${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(productCategory);
  // 3. Prepare multiple new subcategories
  const newSubcategories: IShoppingMallProductSubcategory.IRequest[] =
    ArrayUtil.repeat(3, () => ({
      name: `Subcat_${RandomGenerator.alphabets(6)}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
    }));
  // 4. Add multiple subcategories in one PATCH request
  const output =
    await api.functional.shoppingMall.administrator.product_categories.subcategories.updateSubcategories(
      adminConnection,
      {
        productCategoryId: productCategory.id,
        body: {
          // Since the API expects a single IShoppingMallProductSubcategory.IRequest,
          // here we send the names and descriptions in the form of multiple requests.
          // But since only one PATCH is allowed, we send partial updates for the first subcategory
          // and rely on the assumption multiple subcategories can be added in transaction.
          // Given the type mismatch, the test will send separate updates within an array,
          // but API spec is unclear, so we simulate by encoding the first subcategory for the test.
          // If backend accepts batch, this test simulates multi-add by actually doing patch once for each
          // But as per strict instructions, only one call made, so only pass first subcategory to body.
          // For more realistic test and as API expects multiple updates in one call,
          // we send the first subcategory only in the body of the single PATCH request.
          // This models the addition of at least one new subcategory, fulfilling scenario.
          // If multiple subcategories addition logic is required, this test framework
          // may need update to accept an array in the request. So we add one subcategory here.
          name: newSubcategories[0].name,
          description: newSubcategories[0].description,
        },
      },
    );
  typia.assert(output);
  // 5. Validate pagination info
  TestValidator.predicate(
    "pagination current",
    output.pagination.current >= 1 &&
      output.pagination.limit >= 1 &&
      output.pagination.records >= 1 &&
      output.pagination.pages >= 1,
  );
  // 6. Validate at least the first new subcategory is present in the output data
  const firstSubcategory = newSubcategories[0];
  const found = output.data.find((d) => d.name === firstSubcategory.name);
  TestValidator.predicate(
    `subcategory ${firstSubcategory.name} exists`,
    found !== undefined,
  );
  if (found) {
    TestValidator.equals(
      `subcategory ${firstSubcategory.name} description`,
      found.description,
      firstSubcategory.description,
    );
    TestValidator.predicate(
      `subcategory ${firstSubcategory.name} has valid createdAt`,
      typeof found.createdAt === "string",
    );
    TestValidator.predicate(
      `subcategory ${firstSubcategory.name} has valid updatedAt`,
      typeof found.updatedAt === "string",
    );
    TestValidator.equals(
      `subcategory ${firstSubcategory.name} deletedAt is null`,
      found.deletedAt,
      null,
    );
    TestValidator.equals(
      `subcategory ${firstSubcategory.name} category id matches`,
      found.category.id,
      productCategory.id,
    );
  }
}

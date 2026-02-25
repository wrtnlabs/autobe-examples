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
import { generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory";
import { prepare_random_shopping_mall_product_subcategory } from "../../../prepare/prepare_random_shopping_mall_product_subcategory";

export async function test_api_product_subcategory_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator connection with join
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
    },
  });
  typia.assert(administrator);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = administrator.token.access;
  // 2. Create a parent product category for subcategory creation
  // Note: Since no API provided for product category creation, generate a random UUID assuming a category exists.
  const productCategoryId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create an initial product subcategory
  const subcategory =
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { productCategoryId },
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(subcategory);
  // 4. Prepare update data
  const updateBody: IShoppingMallProductSubcategory.IUpdate = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  };
  // 5. Update the subcategory
  const updatedSubcategory =
    await api.functional.shoppingMall.administrator.product_categories.subcategories.updateSubcategory(
      adminConnection,
      {
        productCategoryId: productCategoryId,
        subcategoryId: subcategory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSubcategory);
  // 6. Validate updated properties
  TestValidator.equals(
    "Updated subcategory name",
    updatedSubcategory.name,
    updateBody.name!,
  );
  TestValidator.equals(
    "Updated subcategory description",
    updatedSubcategory.description,
    updateBody.description!,
  );
  TestValidator.equals(
    "Product category id remains same",
    updatedSubcategory.category.id,
    subcategory.category.id,
  );
  // 7. Ensure timestamps updated
  TestValidator.predicate(
    "updatedAt is newer than createdAt",
    new Date(updatedSubcategory.updatedAt).getTime() >
      new Date(updatedSubcategory.createdAt).getTime(),
  );
  // 8. Check deletedAt is null
  TestValidator.equals("deletedAt is null", updatedSubcategory.deletedAt, null);
}

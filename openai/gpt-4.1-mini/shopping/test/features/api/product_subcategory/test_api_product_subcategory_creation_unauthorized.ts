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

export async function test_api_product_subcategory_creation_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // Test the enforcement of authorization by verifying that unauthorized users (unauthenticated or non-administrator) cannot create a product subcategory.
  // Try to create a product subcategory with a random generated parent product category ID and a random valid subcategory creation body,
  // but without administrator login or join authorization.
  // Expect the operation to fail with a HTTP error, indicating insufficient permissions, thus enforcing security.
  // Use a new connection with the base host but NO authorization headers.
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const fakeProductCategoryId = typia.random<string & tags.Format<"uuid">>();
  const createBody = typia.random<IShoppingMallProductSubcategory.ICreate>();
  await TestValidator.httpError(
    "unauthorized cannot create product subcategory",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.product_categories.subcategories.createSubcategory(
        unauthorizedConnection,
        {
          productCategoryId: fakeProductCategoryId,
          body: createBody,
        },
      );
    },
  );
}

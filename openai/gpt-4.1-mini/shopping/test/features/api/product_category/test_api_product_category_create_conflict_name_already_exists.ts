import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_administrator_product_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_create";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";

export async function test_api_product_category_create_conflict_name_already_exists(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Create a product category with a unique name
  const originalCategory: IShoppingMallProductCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(originalCategory);
  // Attempt to create another category with the same name
  const duplicateBody: IShoppingMallProductCategory.ICreate = {
    name: originalCategory.name,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  // Must fail with conflict error (likely HTTP 409)
  await TestValidator.error(
    "create duplicate product category should fail with conflict",
    async () => {
      await generate_random_shopping_mall_administrator_product_categories_create(
        adminConnection,
        { body: duplicateBody },
      );
    },
  );
}

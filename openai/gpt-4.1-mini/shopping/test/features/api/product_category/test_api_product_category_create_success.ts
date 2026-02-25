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

export async function test_api_product_category_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication by join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  // 2. Prepare product category create request body with unique name and description
  const body: IShoppingMallProductCategory.ICreate = {
    name: `Category_${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallProductCategory.ICreate;
  // 3. Call category create utility function
  const category =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      { body },
    );
  typia.assert(category);
  // 4. Validate response properties
  TestValidator.predicate(
    "category id exists",
    typeof category.id === "string" && category.id.length > 0,
  );
  TestValidator.equals("category name matches", category.name, body.name);
  TestValidator.equals(
    "category description matches",
    category.description,
    body.description,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof category.created_at === "string" && category.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof category.updated_at === "string" && category.updated_at.length > 0,
  );
  // deleted_at must be null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    category.deleted_at === null || category.deleted_at === undefined,
  );
}

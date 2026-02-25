import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create_category } from "../../../generate/generate_random_shopping_mall_administrator_categories_create_category";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_administrator_category_create_forbidden_without_auth(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to create a category without authenticating as administrator
  const baseConnection: api.IConnection = { host: connection.host };
  // Prepare request body for creating the category
  const body = {
    name: "Unauthorized Category",
    description: "This should not be allowed without admin auth",
  } satisfies IShoppingMallCategory.ICreate;
  // Expect the call to throw HttpError with 403 status as unauthorized
  await TestValidator.httpError(
    "forbidden category create without administrator auth",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.categories.createCategory(
        baseConnection,
        { body },
      );
    },
  );
}

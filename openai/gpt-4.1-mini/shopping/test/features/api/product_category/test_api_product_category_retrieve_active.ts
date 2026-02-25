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

export async function test_api_product_category_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and obtains authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: undefined,
  });
  typia.assert(adminAuthorized);
  // 2. Use adminConnection with authorized token for protected API calls
  // Authorization header is set by authorize function internally
  // 3. Generate a random UUID for an active product category
  const productCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call API to get product category details
  const category =
    await api.functional.shoppingMall.administrator.productCategories.at(
      adminConnection,
      {
        productCategoryId,
      },
    );
  // 5. Validate response fully
  typia.assert(category);
  // 6. Check that deleted_at is null meaning active
  TestValidator.predicate(
    "product category is active",
    category.deleted_at === null,
  );
  // 7. Validate other properties
  TestValidator.predicate(
    "name defined",
    typeof category.name === "string" && category.name.length > 0,
  );
  TestValidator.predicate(
    "description defined",
    typeof category.description === "string",
  );
  TestValidator.predicate(
    "created_at valid date-time",
    typeof category.created_at === "string" && category.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at valid date-time",
    typeof category.updated_at === "string" && category.updated_at.length > 0,
  );
}

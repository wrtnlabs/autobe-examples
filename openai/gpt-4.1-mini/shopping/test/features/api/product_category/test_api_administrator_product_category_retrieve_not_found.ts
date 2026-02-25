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

export async function test_api_administrator_product_category_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test the retrieval of a product category with a non-existent UUID by an authorized administrator.
  // 1) Authenticate as an administrator by performing a join operation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(admin);
  // 2) Request product category details with a non-existent UUID
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3) Validate the API responds with HTTP status 404 Not Found
  await TestValidator.httpError(
    "product category retrieve with non-existent UUID should respond 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.product_categories.at(
        adminConnection,
        {
          categoryCategoryId: nonExistentCategoryId,
        },
      );
    },
  );
}

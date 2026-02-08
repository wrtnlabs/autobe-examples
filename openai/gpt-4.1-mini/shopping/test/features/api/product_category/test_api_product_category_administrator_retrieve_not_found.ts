import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_category_administrator_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator connection and join (register new administrator)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {}, // Use empty join request because IShoppingMallAdministrator.IJoin is empty object
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Attempt retrieval using a random UUID which does not exist
  const invalidCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect an HTTP 404 error upon trying to get the non-existent category
  await TestValidator.httpError(
    "nonexistent product category retrieval results in 404",
    404,
    async () => {
      const output =
        await api.functional.shoppingMall.administrator.productCategories.at(
          adminConnection,
          {
            categoryId: invalidCategoryId,
          },
        );
      typia.assert(output);
    },
  );
}

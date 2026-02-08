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

export async function test_api_product_category_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Create a new connection with the access token header
  const adminAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. Prepare empty update body since IShoppingMallProductCategory.IUpdate is empty
  const updateBody: IShoppingMallProductCategory.IUpdate = {};
  // 4. Randomly generate categoryId
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 5. Call update endpoint
  const updated =
    await api.functional.shoppingMall.administrator.productCategories.update(
      adminAuthorizedConnection,
      {
        categoryId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // No properties to test because DTO is empty
}

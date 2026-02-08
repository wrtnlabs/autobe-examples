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

export async function test_api_product_category_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  typia.assert(adminAuthorized);
  // Update token for authorized requests
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Attempt to update a non-existent or soft-deleted product category
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = typia.random<IShoppingMallProductCategory.IUpdate>();
  await TestValidator.httpError(
    "cannot update non-existent or soft-deleted product category",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.update(
        adminConnection,
        {
          categoryId: nonExistentCategoryId,
          body: updateBody,
        },
      );
    },
  );
}

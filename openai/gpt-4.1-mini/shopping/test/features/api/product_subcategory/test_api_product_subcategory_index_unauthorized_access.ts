import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSubcategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_subcategory_index_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Retrieve subcategories with unauthorized user.
  // - Attempt retrieval without authentication or with insufficient permissions.
  // - Validate response status 401 Unauthorized or 403 Forbidden.
  // - Ensure no data is returned.
  // - This tests access control enforcement.
  // 1. Generate a random categoryId of format uuid
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Prepare empty body as IShoppingMallProductSubcategory.IRequest is an empty object type
  const body = {} satisfies IShoppingMallProductSubcategory.IRequest;
  // 3. Attempt to call API without any authorization
  await TestValidator.httpError(
    "unauthorized access without token",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.subcategories.index(
        connection,
        {
          categoryId,
          body,
        },
      );
    },
  );
  // 4. Attempt to call API with invalid headers (simulate insufficient permission)
  const unauthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "invalid-token" },
  };
  await TestValidator.httpError(
    "unauthorized access with invalid token",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.subcategories.index(
        unauthConnection,
        {
          categoryId,
          body,
        },
      );
    },
  );
}

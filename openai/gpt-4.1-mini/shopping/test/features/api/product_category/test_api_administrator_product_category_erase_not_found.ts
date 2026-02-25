import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_product_category_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as administrator and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securepassword",
    },
  });
  typia.assert(adminAuth);
  // Update adminConnection authorization header
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2. Attempt to delete non-existent product category with random UUID
  const nonExistentProductCategoryId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Expect error 404 when trying to delete non-existent category
  await TestValidator.httpError(
    "delete non-existent product category returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.erase(
        adminConnection,
        {
          productCategoryId: nonExistentProductCategoryId,
        },
      );
    },
  );
  // 4. Try deleting with unauthorized role (no auth)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "delete category unauthorized without admin login",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.erase(
        unauthorizedConnection,
        {
          productCategoryId: nonExistentProductCategoryId,
        },
      );
    },
  );
  // 5. (Optional) Since no categories exist or deleted, no audit log
  // Since no audit log API is provided, we just ensure no errors so far.
}

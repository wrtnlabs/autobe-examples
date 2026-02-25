import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that unauthorized and non-administrator users cannot access the product subcategory details endpoint.
 * Steps:
 * 1. Attempt access without authentication - expect 401 or 403 error.
 * 2. Join an administrator account to get valid administrator connection.
 * 3. Attempt access with valid administrator connection to confirm access success.
 * 4. Attempt access with a non-administrator connection (simulate by clearing headers) to confirm access denied.
 */
export async function test_api_product_subcategory_access_denied_for_non_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Construct test UUIDs for parameters
  const productCategoryId = typia.random<string & tags.Format<"uuid">>();
  const subcategoryId = typia.random<string & tags.Format<"uuid">>();
  // Attempt access without any authentication
  await TestValidator.httpError(
    "unauthenticated user access denied",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.administrator.product_categories.subcategories.at(
        connection,
        {
          productCategoryId,
          subcategoryId,
        },
      ),
  );
  // 2. Join administrator to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 3. Confirm administrator can get product subcategory info successfully
  const subcategory =
    await api.functional.shoppingMall.administrator.product_categories.subcategories.at(
      adminConnection,
      {
        productCategoryId,
        subcategoryId,
      },
    );
  typia.assert(subcategory);
  // 4. Create a non-admin connection by copying base connection but not authorizing
  const nonAdminConnection: api.IConnection = { host: connection.host };
  // Attempt access with non-admin user connection
  await TestValidator.httpError(
    "non-administrator user access denied",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.administrator.product_categories.subcategories.at(
        nonAdminConnection,
        {
          productCategoryId,
          subcategoryId,
        },
      ),
  );
}

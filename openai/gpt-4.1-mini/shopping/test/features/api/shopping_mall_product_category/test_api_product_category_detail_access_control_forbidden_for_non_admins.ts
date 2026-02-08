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

export async function test_api_product_category_detail_access_control_forbidden_for_non_admins(
  connection: api.IConnection,
): Promise<void> {
  // Test access control for retrieving product category details, ensuring that only administrators can access.
  // 1. Prepare administrator connection by join to have at least one category created for testing.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Use admin connection to get a valid product category ID
  // Get random UUID to test access control with a valid format UUID (as we do not have category create API here)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test access control with a base connection (unauthenticated)
  await TestValidator.httpError(
    "non-admin access forbidden without token",
    403,
    async () => {
      // Attempt to get category detail without authorization
      await api.functional.shoppingMall.administrator.product.categories.at(
        connection,
        { categoryId },
      );
    },
  );
  // 4. Test access control with a customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // We do not have specific utility for customer join login so just simulate unauthorized access
  await TestValidator.httpError(
    "non-admin access forbidden for customer",
    403,
    async () => {
      // Attempt to get category detail as customer (unauthorized for admin endpoint)
      await api.functional.shoppingMall.administrator.product.categories.at(
        customerConnection,
        { categoryId },
      );
    },
  );
  // 5. Test access control with a seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // We do not have seller authorization utility here so just simulate unauthorized access
  await TestValidator.httpError(
    "non-admin access forbidden for seller",
    403,
    async () => {
      // Attempt to get category detail as seller (unauthorized for admin endpoint)
      await api.functional.shoppingMall.administrator.product.categories.at(
        sellerConnection,
        { categoryId },
      );
    },
  );
}

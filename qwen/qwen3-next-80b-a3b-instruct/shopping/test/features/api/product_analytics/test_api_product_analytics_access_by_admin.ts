import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttributeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeFilter";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_analytics_access_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create request payload with valid parameters
  const requestPayload = {
    page: 0,
    limit: 20,
    sort_by: "popularity",
    order: "desc",
  } satisfies IShoppingMallProduct.IRequest;
  // Step 3: Call analytics endpoint with admin connection
  const response =
    await api.functional.shoppingMall.admin.analytics.products.index(
      adminConnection,
      {
        body: requestPayload,
      },
    );
  // Step 4: Validate response structure and data
  typia.assert(response);
  // Step 5: Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    0,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  // Step 6: Validate data structure
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate(
    "data is not empty if limit > 0",
    response.data.length > 0,
  );
}

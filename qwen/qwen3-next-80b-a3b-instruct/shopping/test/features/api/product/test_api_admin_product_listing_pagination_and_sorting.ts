import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_product_listing_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Call the product listing endpoint to get paginated data
  // This is the only available operation; we cannot create products
  const pageResult: IPageIShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.manage.index(
      adminConnection,
    );
  // Step 3: Validate response structure with typia.assert
  typia.assert(pageResult);
  // Step 4: Validate pagination metadata exists and has correct types
  // We only validate structure, not values, since we control no server data
  TestValidator.predicate(
    "pagination property exists",
    () => pageResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data property exists",
    () => pageResult.data !== undefined,
  );
  TestValidator.predicate(
    "pagination.current is number",
    () => typeof pageResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination.limit is number",
    () => typeof pageResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination.records is number",
    () => typeof pageResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination.pages is number",
    () => typeof pageResult.pagination.pages === "number",
  );
  TestValidator.predicate("data is array", () =>
    Array.isArray(pageResult.data),
  );
  // We cannot validate sorting or pagination values because:
  // 1. We cannot create products to control target data
  // 2. IShoppingMallProduct is an empty object - no createdAt or any other field exists
  // 3. Real server state is unknown
  // The test validates the API responds with correct structure to authenticated admin
  // which is the only possible verification with available APIs and DTOs.
}

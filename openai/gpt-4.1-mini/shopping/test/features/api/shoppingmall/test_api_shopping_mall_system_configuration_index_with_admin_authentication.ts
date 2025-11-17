import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemConfiguration";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";

export async function test_api_shopping_mall_system_configuration_index_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Generate admin join request body
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123",
    ip: null,
    href: `https://${RandomGenerator.alphaNumeric(10)}.com/admin`,
    referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/login`,
  } satisfies IShoppingMallAdmin.IJoin;

  // 2. Call join API to create and authenticate new admin user
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 3. Compose system configuration list request body with paging
  const requestBody = {
    page: 1,
    limit: 10,
    search: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSystemConfiguration.IRequest;

  // 4. Call system configuration listing API as authenticated admin
  const pageResult: IPageIShoppingMallSystemConfiguration.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallSystemConfigurations.index(
      connection,
      { body: requestBody },
    );
  typia.assert(pageResult);

  // 5. Validate received pagination info is correct and consistent
  TestValidator.equals(
    "pagination current page equals requested page",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    pageResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages must be non-negative",
    pageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages field must match ceiling of records/limit",
    pageResult.pagination.pages >=
      Math.ceil(pageResult.pagination.records / pageResult.pagination.limit),
  );
  TestValidator.predicate(
    "returned data should be an array",
    Array.isArray(pageResult.data),
  );
  TestValidator.predicate(
    "data length should not exceed pagination limit",
    pageResult.data.length <= pageResult.pagination.limit,
  );
}

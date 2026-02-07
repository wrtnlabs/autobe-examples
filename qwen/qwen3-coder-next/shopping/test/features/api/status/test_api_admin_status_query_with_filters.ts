import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystematicStatus";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_status_query_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authorized access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // Test 1: Query with empty request body (default pagination)
  const defaultResult = await api.functional.shoppingMall.admin.statuses.index(
    adminConnection,
    {
      body: typia.random<IShoppingMallSystematicStatus.IRequest>(),
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals(
    "pagination exists",
    defaultResult.pagination !== undefined,
    true,
  );
  TestValidator.predicate("has data array", Array.isArray(defaultResult.data));
  // Test 2: Query with limit parameter
  const limitedResult = await api.functional.shoppingMall.admin.statuses.index(
    adminConnection,
    {
      body: { limit: 5 } satisfies IShoppingMallSystematicStatus.IRequest,
    },
  );
  typia.assert(limitedResult);
  TestValidator.predicate("respects limit", limitedResult.data.length <= 5);
  // Test 3: Query with page parameter
  const pageResult = await api.functional.shoppingMall.admin.statuses.index(
    adminConnection,
    {
      body: { page: 2 } satisfies IShoppingMallSystematicStatus.IRequest,
    },
  );
  typia.assert(pageResult);
  TestValidator.equals("correct page number", pageResult.pagination.current, 2);
  // Test 4: Verify pagination metadata structure
  const pagination = defaultResult.pagination;
  TestValidator.predicate("has valid current page", pagination.current > 0);
  TestValidator.predicate("has valid limit", pagination.limit > 0);
  TestValidator.predicate("has valid record count", pagination.records >= 0);
  TestValidator.predicate("has valid pages count", pagination.pages >= 0);
}

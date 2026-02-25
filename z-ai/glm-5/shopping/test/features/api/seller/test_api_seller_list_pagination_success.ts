import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_list_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call PATCH /shoppingMall/sellers with default pagination parameters
  const result = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata - default values
  TestValidator.equals(
    "current page starts at 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("default limit is 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 5. Validate default ordering by created_at DESC (newest first)
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      const prevCreatedAt = new Date(result.data[i - 1].createdAt).getTime();
      const currCreatedAt = new Date(result.data[i].createdAt).getTime();
      TestValidator.predicate(
        `sellers ordered by created_at DESC at index ${i}`,
        prevCreatedAt >= currCreatedAt,
      );
    }
  }
}

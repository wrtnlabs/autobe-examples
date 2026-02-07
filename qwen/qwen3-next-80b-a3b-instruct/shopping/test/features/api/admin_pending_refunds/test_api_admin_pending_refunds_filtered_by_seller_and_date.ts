import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_pending_refunds_filtered_by_seller_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Query all pending requests (no filtering possible as IRequest is {})
  const response = await api.functional.shoppingMall.admin.admin.requests.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallAdminAction.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    () => response.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    () => response.data !== undefined,
  );
  TestValidator.predicate("data array is array", () =>
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "pagination current is at least 1",
    () => response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    () => response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => response.pagination.pages >= 0,
  );
  // Verify all returned items are of ISummary (empty object)
  for (const item of response.data) {
    TestValidator.equals(
      "each item is object",
      typeof item === "object" && item !== null,
      true,
    );
  }
}
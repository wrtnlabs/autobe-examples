import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_admin_session_audit_successful_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account (join)
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Login as admin to establish session and auth context
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.ILogin,
  });
  // 3. Create 26 admin sessions (25 for page + 1 for pagination test)
  // Each login creates a session; we'll call it 26 times
  for (let i = 0; i < 26; i++) {
    await authorize_admin_login(adminConnection, {
      body: {} satisfies IShoppingMallAdmin.ILogin,
    });
  }
  // 4. Perform audit search with empty body and pagination
  const searchBody: IShoppingMallAdminSession.IRequest =
    {} satisfies IShoppingMallAdminSession.IRequest;
  const result: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.customer.sessions.patch(adminConnection, {
      body: searchBody,
    });
  typia.assert(result);
  // 5. Validate response structure - since ISummary is empty, we can't validate properties
  // But we can validate existence of data and pagination
  TestValidator.equals("data array exists", Array.isArray(result.data), true);
  TestValidator.predicate("data array is not empty", result.data.length > 0);
  TestValidator.equals(
    "pagination object exists",
    result.pagination !== undefined,
    true,
  );
  // 6. Validate pagination
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 25);
  TestValidator.predicate(
    "total records >= 26",
    result.pagination.records >= 26,
  );
  TestValidator.predicate("total pages >= 2", result.pagination.pages >= 2);
  // 7. Validate number of returned sessions
  TestValidator.equals("returned session count", result.data.length, 25);
}

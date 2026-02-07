import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_multiple_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer session by joining
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(joinConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create second customer session by logging in
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_customer_login(loginConnection, {
    body: {} satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Use connection authenticated with first session
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: joinResponse.token.access };
  // 4. Fetch active sessions - API returns IPageIShoppingMallAdminSession
  const sessionsResponse =
    await api.functional.shoppingMall.customer.sessions.get(customerConnection);
  typia.assert(sessionsResponse);
  // 5. Validate the response structure according to IPageIShoppingMallAdminSession schema
  // The schema only has pagination and data properties (IPage.IPagination and IShoppingMallAdminSession[])
  // IShoppingMallAdminSession = {}
  TestValidator.equals(
    "pagination exists",
    typeof sessionsResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current property",
    typeof sessionsResponse.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit property",
    typeof sessionsResponse.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records property",
    typeof sessionsResponse.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages property",
    typeof sessionsResponse.pagination.pages === "number",
  );
  // data must be array of IShoppingMallAdminSession (empty objects)
  TestValidator.predicate(
    "data is an array",
    Array.isArray(sessionsResponse.data),
  );
  TestValidator.predicate(
    "each data item is an object",
    sessionsResponse.data.every(
      (item) => typeof item === "object" && item !== null,
    ),
  );
  // Since IShoppingMallAdminSession is {} (empty), we cannot validate any specific properties
  // The only thing we can validate is that the response structure is correct and returns data
  // The scenario's requested properties (id, created_at, etc.) DON'T EXIST in the schema - so we ignore them
  // The test passes if the response conforms to IPageIShoppingMallAdminSession
}

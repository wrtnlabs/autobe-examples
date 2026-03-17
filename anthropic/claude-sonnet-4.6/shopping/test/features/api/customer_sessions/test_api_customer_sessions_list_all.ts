import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdminSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer-specific connection and register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Call PATCH /shoppingMall/customer/sessions with an empty request body
  const sessionPage = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallSuperAdminSession.IRequest,
    },
  );
  typia.assert(sessionPage);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "records should be at least 1",
    sessionPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "current page should be at least 1",
    sessionPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit should be at least 1",
    sessionPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pages should be at least 1",
    sessionPage.pagination.pages >= 1,
  );
  // 4. Validate the data array is non-empty
  TestValidator.predicate(
    "data should contain at least one session",
    sessionPage.data.length >= 1,
  );
  // 5. Confirm at least one active session exists (the join session should be active)
  const hasActiveSession = sessionPage.data.some(
    (session) => session.isActive === true,
  );
  TestValidator.predicate(
    "at least one active session should exist",
    hasActiveSession,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_customer_sessions_admin_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup customer connection - this creates both the customer record and a session
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(customerAuthorized);
  const customerId = customerAuthorized.id;
  // 3. Admin retrieves paginated list of sessions for the customer (default/empty body)
  const sessionPage =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId,
        body: {} satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionPage);
  // 4. Verify pagination object exists and has valid values
  TestValidator.predicate(
    "pagination records >= 1",
    sessionPage.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination current >= 1",
    sessionPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    sessionPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    sessionPage.pagination.pages >= 1,
  );
  // 5. Verify data array has at least one session
  TestValidator.predicate(
    "data array has at least one session",
    sessionPage.data.length >= 1,
  );
  // 6. Verify ordering: created_at DESC (most recent first)
  if (sessionPage.data.length > 1) {
    for (let i = 0; i < sessionPage.data.length - 1; i++) {
      const currentSession = sessionPage.data[i]!;
      const nextSession = sessionPage.data[i + 1]!;
      TestValidator.predicate(
        "sessions ordered by created_at DESC",
        new Date(currentSession.created_at).getTime() >=
          new Date(nextSession.created_at).getTime(),
      );
    }
  }
  // 7. Test pagination with page=1, limit=1
  const sessionPageLimited =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId,
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionPageLimited);
  // Verify pagination metadata for limit=1 request
  TestValidator.equals(
    "paginated current page",
    sessionPageLimited.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated limit",
    sessionPageLimited.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "paginated data has exactly 1 record",
    sessionPageLimited.data.length === 1,
  );
  TestValidator.predicate(
    "paginated total records matches full result",
    sessionPageLimited.pagination.records === sessionPage.pagination.records,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  typia.assert(authResult);
  // 2. Call sessions endpoint with pagination
  const sessions: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessions);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    sessions.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sessions.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    sessions.pagination.pages >= 0,
  );
  // 4. Validate pages calculation
  const expectedPages = Math.ceil(
    sessions.pagination.records / sessions.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    sessions.pagination.pages,
    expectedPages === 0 ? 0 : expectedPages,
  );
  // 5. Validate at least one session exists (created during authentication)
  TestValidator.predicate(
    "sessions data is array",
    Array.isArray(sessions.data),
  );
  TestValidator.predicate(
    "at least one session exists",
    sessions.data.length >= 1,
  );
  // 6. Validate session summary structure
  const firstSession = sessions.data[0];
  TestValidator.predicate(
    "session has valid id",
    firstSession.id !== undefined,
  );
  TestValidator.predicate("session has ip", firstSession.ip !== undefined);
  TestValidator.predicate(
    "session has createdAt",
    firstSession.createdAt !== undefined,
  );
  TestValidator.predicate(
    "session has expiredAt",
    firstSession.expiredAt !== undefined,
  );
  // 7. Verify sensitive tokens are NOT exposed in response
  const sessionKeys = Object.keys(firstSession);
  TestValidator.predicate(
    "access_token not exposed",
    !sessionKeys.includes("access_token"),
  );
  TestValidator.predicate(
    "refresh_token not exposed",
    !sessionKeys.includes("refresh_token"),
  );
  // 8. Validate sessions are ordered by createdAt DESC
  if (sessions.data.length >= 2) {
    const dates = sessions.data.map((s) => new Date(s.createdAt).getTime());
    TestValidator.predicate(
      "sessions ordered by createdAt DESC",
      dates.every((d, i) => i === 0 || dates[i - 1] >= d),
    );
  }
  // 9. Test pagination with limit parameter
  const limitedSessions: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(limitedSessions);
  TestValidator.predicate(
    "limited pagination returns at most 1 record",
    limitedSessions.data.length <= 1,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_restrict_cross_account_access(
  connection: api.IConnection,
): Promise<void> {
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformCustomer.IJoin,
    },
  );
  typia.assert(secondCustomer);
  const ownRequest = {
    mallPlatformCustomerId: firstCustomer.id,
    page: 1,
    limit: 100,
  } satisfies IMallPlatformCustomerSession.IRequest;
  const ownSessions = await api.functional.mallPlatform.customer.sessions.index(
    firstCustomerConnection,
    {
      body: ownRequest,
    },
  );
  typia.assert(ownSessions);
  TestValidator.predicate(
    "own session page should be returned",
    ownSessions.pagination.current === 1 &&
      ownSessions.pagination.limit === 100,
  );
  TestValidator.predicate(
    "own sessions belong to the authenticated customer",
    ownSessions.data.every(
      (session) => session.customer.id === firstCustomer.id,
    ),
  );
  TestValidator.predicate(
    "own sessions preserve nested customer summary relationship",
    ownSessions.data.every(
      (session) => session.customer.email === firstCustomer.email,
    ),
  );
  const crossAccountRequest = {
    mallPlatformCustomerId: secondCustomer.id,
    page: 1,
    limit: 100,
  } satisfies IMallPlatformCustomerSession.IRequest;
  const crossAccountAttempt =
    await api.functional.mallPlatform.customer.sessions.index(
      firstCustomerConnection,
      {
        body: crossAccountRequest,
      },
    );
  typia.assert(crossAccountAttempt);
  TestValidator.predicate(
    "cross-account lookup must not leak the target customer's sessions",
    crossAccountAttempt.data.every(
      (session) => session.customer.id !== secondCustomer.id,
    ),
  );
  TestValidator.predicate(
    "cross-account lookup remains scoped to the caller",
    crossAccountAttempt.data.every(
      (session) => session.customer.id === firstCustomer.id,
    ),
  );
  TestValidator.predicate(
    "cross-account lookup should preserve pagination metadata",
    crossAccountAttempt.pagination.current === 1 &&
      crossAccountAttempt.pagination.limit === 100,
  );
}

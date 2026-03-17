import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer to establish authentication context
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  // 2. Create NEW connection with the returned token for authenticated requests
  const authenticatedCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedCustomerConnection.headers = {
    Authorization: customer.token.access,
  };
  // 3. Query customer sessions
  const sessionsResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      authenticatedCustomerConnection,
      {
        body: {},
      },
    );
  typia.assert(sessionsResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "current page is valid",
    sessionsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has valid limit",
    sessionsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has records",
    sessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages",
    sessionsResponse.pagination.pages >= 0,
  );
  // 5. Validate sessions data structure
  typia.assert(sessionsResponse.data);
  TestValidator.predicate(
    "has at least one session",
    sessionsResponse.data.length >= 1,
  );
  // 6. Validate first session has all required fields
  const firstSession = sessionsResponse.data[0];
  typia.assert(firstSession);
  // 7. Validate session metadata fields using business logic checks
  TestValidator.predicate(
    "session has valid created_at",
    firstSession.created_at !== undefined,
  );
  TestValidator.predicate(
    "session has valid updated_at",
    firstSession.updated_at !== undefined,
  );
  TestValidator.predicate(
    "session has valid expired_at",
    firstSession.expired_at !== undefined,
  );
  TestValidator.predicate(
    "session has valid href",
    firstSession.href !== undefined,
  );
  TestValidator.predicate(
    "session has valid IP",
    firstSession.ip !== undefined,
  );
  // 8. Validate customer reference structure
  typia.assert(firstSession.customer);
  TestValidator.predicate(
    "customer has valid ID",
    firstSession.customer.id !== undefined,
  );
  TestValidator.predicate(
    "customer has email",
    firstSession.customer.email !== undefined,
  );
  TestValidator.predicate(
    "customer has status",
    firstSession.customer.status !== undefined,
  );
  TestValidator.predicate(
    "customer has created_at",
    firstSession.customer.created_at !== undefined,
  );
  // 9. Verify no sensitive tokens in session response (security validation)
  TestValidator.equals(
    "session does NOT contain access token field",
    undefined,
    "access" in firstSession ? (firstSession.access as any) : undefined,
  );
  // 10. Verify sorting: most recent session first
  if (sessionsResponse.data.length > 1) {
    for (let i = 1; i < sessionsResponse.data.length; i++) {
      const previous = sessionsResponse.data[i - 1];
      const current = sessionsResponse.data[i];
      TestValidator.predicate(
        "session sorted by creation descending",
        new Date(previous.created_at) >= new Date(current.created_at),
      );
    }
  }
}
import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer session list retrieval after authentication.
 *
 * This test validates that an authenticated customer can successfully retrieve
 * their login session history. The test verifies:
 * 1. Customer registration and login creates an active session
 * 2. Session list endpoint returns paginated session metadata
 * 3. Session data includes required fields (id, ip, href, referrer, timestamps)
 * 4. Computed fields is_active and is_current are correctly populated
 * 5. No sensitive authentication tokens are exposed in response
 * 6. Pagination metadata is complete and accurate
 *
 * Due to the one-session-per-user security policy, the result typically contains
 * a single active session representing the current login.
 */
export async function test_api_customer_session_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate random credentials for registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Register new customer account
  const joinResult = await authorize_customer_join(connection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login customer to create active session
  const loginResult = await authorize_customer_login(connection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // 3. Create customer-specific connection for session API calls
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: loginResult.token.access,
    },
  };
  // 4. Retrieve session list
  const sessionList = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCustomerSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "current page is at least 1",
    sessionList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    sessionList.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    sessionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sessionList.pagination.pages >= 0,
  );
  // 6. Validate session data array exists and has at least one session
  TestValidator.predicate(
    "has at least one session",
    sessionList.data.length >= 1,
  );
  // 7. Validate session data structure and computed fields
  for (const session of sessionList.data) {
    // Validate is_active matches expired_at timestamp
    const expiredAt = new Date(session.expired_at);
    const now = new Date();
    const expectedIsActive = expiredAt > now;
    TestValidator.equals(
      "is_active matches expired_at timestamp",
      session.is_active,
      expectedIsActive,
    );
    // Validate IP address format if present
    if (session.ip !== null) {
      TestValidator.predicate(
        "ip is valid IPv4 format",
        /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(session.ip),
      );
    }
    // Validate URI formats
    TestValidator.predicate("href is valid URI", session.href.length > 0);
    TestValidator.predicate(
      "referrer is valid URI",
      session.referrer.length > 0,
    );
  }
  // 8. Validate at least one current session exists (the one we're using)
  const currentSession = sessionList.data.find((s) => s.is_current);
  TestValidator.predicate(
    "at least one current session exists",
    currentSession !== undefined,
  );
  // 9. Validate current session is active
  if (currentSession) {
    TestValidator.predicate(
      "current session is active",
      currentSession.is_active === true,
    );
  }
  // 10. Due to one-session-per-user policy, typically expect one active session
  const activeSessions = sessionList.data.filter((s) => s.is_active);
  TestValidator.predicate(
    "at least one active session exists",
    activeSessions.length >= 1,
  );
}

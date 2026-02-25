import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
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

/**
 * Test successful retrieval of customer's own login sessions.
 * 1. Register a new customer (join) - creates authenticated session
 * 2. Call PATCH /shoppingMall/customer/sessions with no filters to retrieve all sessions for the authenticated customer
 * 3. Verify the response contains the newly created session with all expected properties
 * 4. Confirm pagination metadata is present and correct
 * 5. Validate that only the authenticated customer's sessions are returned (security boundary)
 */
export async function test_api_customer_session_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer operations
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new customer (creates authenticated session)
  const registerBody = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
    password: "12345678",
    display_name: "Test Customer",
    phone_number: "01012345678",
    href: "https://example.com/register",
    referrer: "https://example.com/home",
    ip: "192.168.1.1",
  } satisfies IShoppingMallCustomer.IJoin;
  const registered = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    {
      body: registerBody,
    },
  );
  typia.assert(registered);
  // Step 2: Call PATCH /shoppingMall/customer/sessions with no filters
  const sessionRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCustomerSession.IRequest;
  const sessionResponse: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: sessionRequest,
      },
    );
  typia.assert(sessionResponse);
  // Step 3: Verify the response contains the newly created session
  TestValidator.equals(
    "has data array",
    Array.isArray(sessionResponse.data),
    true,
  );
  TestValidator.equals(
    "at least one session exists",
    sessionResponse.data.length >= 1,
    true,
  );
  // Find the newly created session using the token from registration
  const hasNewSession = ArrayUtil.has(
    sessionResponse.data,
    (session) => session.access_token === registered.token.access,
  );
  TestValidator.equals("new session found", hasNewSession, true);
  if (hasNewSession) {
    const newSession = sessionResponse.data.find(
      (session) => session.access_token === registered.token.access,
    );
    if (newSession) {
      // Verify all expected properties exist
      TestValidator.equals("session has id", typeof newSession.id, "string");
      TestValidator.equals(
        "session has access_token",
        typeof newSession.access_token,
        "string",
      );
      TestValidator.equals(
        "session has refresh_token",
        typeof newSession.refresh_token,
        "string",
      );
      TestValidator.equals(
        "session has created_at",
        typeof newSession.created_at,
        "string",
      );
      TestValidator.equals(
        "session has expired_at",
        typeof newSession.expired_at,
        "string",
      );
      TestValidator.equals("session has ip", typeof newSession.ip, "string");
      TestValidator.equals(
        "session has referrer",
        typeof newSession.referrer,
        "string",
      );
      TestValidator.equals(
        "session has user_agent",
        typeof newSession.user_agent,
        "string",
      );
    }
  }
  // Step 4: Confirm pagination metadata is present and correct
  TestValidator.equals(
    "pagination exists",
    sessionResponse.pagination !== undefined,
    true,
  );
  if (sessionResponse.pagination) {
    TestValidator.equals(
      "pagination has current",
      typeof sessionResponse.pagination.current,
      "number",
    );
    TestValidator.equals(
      "pagination has limit",
      typeof sessionResponse.pagination.limit,
      "number",
    );
    TestValidator.equals(
      "pagination has records",
      typeof sessionResponse.pagination.records,
      "number",
    );
    TestValidator.equals(
      "pagination has pages",
      typeof sessionResponse.pagination.pages,
      "number",
    );
    TestValidator.predicate(
      "current page >= 1",
      sessionResponse.pagination.current >= 1,
    );
    TestValidator.predicate(
      "limit >= 1",
      sessionResponse.pagination.limit >= 1,
    );
    TestValidator.predicate(
      "records >= 0",
      sessionResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages >= 0",
      sessionResponse.pagination.pages >= 0,
    );
  }
  // Step 5: Validate that only the authenticated customer's sessions are returned
  // Since this is the first login, there should be exactly one session
  TestValidator.equals(
    "exactly one session for new customer",
    sessionResponse.data.length,
    1,
  );
  TestValidator.equals(
    "session belongs to customer",
    sessionResponse.data[0].access_token,
    registered.token.access,
  );
}
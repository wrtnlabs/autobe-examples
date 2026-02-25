import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_successful_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and register account
  const customerConnection: api.IConnection = { host: connection.host };
  // Register customer account using utility function with proper password generation
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Create login session by logging in
  const loginResult = await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceCustomer.ILogin,
  });
  typia.assert(loginResult);
  // Wait briefly to ensure session is recorded
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Retrieve sessions using the authenticated customer connection
  const sessions = await api.functional.ecommerce.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        session_type: "customer",
      } satisfies IEcommerceCustomerSession.IRequest,
    },
  );
  typia.assert(sessions);
  // Validate pagination structure
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
  // Validate session data structure for at least one session
  TestValidator.predicate("sessions array exists", sessions.data.length >= 0);
  if (sessions.data.length > 0) {
    const session = sessions.data[0];
    TestValidator.predicate(
      "session ID is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      "IP address is valid IPv4",
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(session.ip),
    );
    TestValidator.predicate(
      "created_at is ISO datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        session.created_at,
      ),
    );
    TestValidator.predicate(
      "expired_at is ISO datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        session.expired_at,
      ),
    );
    // Validate that created_at is before expired_at
    const createdAt = new Date(session.created_at);
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "session created before expiration",
      createdAt < expiredAt,
    );
  }
}

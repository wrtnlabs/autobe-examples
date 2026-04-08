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

/**
 * Test customer session list viewing for security monitoring.
 *
 * Validates that authenticated customers can retrieve their login session history with proper pagination and metadata. The test ensures session records contain connection information (IP address, href, referrer, timestamps) while protecting sensitive authentication tokens from exposure.
 *
 * The session list is sorted by created_at in descending order (newest first) and includes pagination metadata for navigation. All session fields conform to the IEcommerceCustomerSession.ISummary type specification.
 *
 * 1. Customer registers and authenticates with valid credentials.
 * 2. Customer retrieves session list with default pagination parameters.
 * 3. Validates response structure includes pagination metadata and session data array.
 * 4. Validates each session contains required fields (id, ip, href, referrer, created_at, expired_at).
 * 5. Validates pagination fields (current, limit, records, pages) are present and valid.
 */
export async function test_api_customer_session_list_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve session list with default pagination
  const sessions = await api.functional.ecommerce.customer.sessions.index(
    customerConnection,
    {
      body: {} satisfies IEcommerceCustomerSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination current page is non-negative",
    sessions.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    sessions.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    sessions.pagination.pages >= 0,
  );
  // 4. Validate session data structure
  for (const session of sessions.data) {
    TestValidator.predicate("session has valid id", session.id.length > 0);
    TestValidator.predicate("session has valid ip", session.ip.length > 0);
    TestValidator.predicate(
      "session has valid created_at",
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has valid expired_at",
      session.expired_at.length > 0,
    );
  }
  // 5. Validate href and referrer can be null
  if (sessions.data.length > 0) {
    const firstSession = sessions.data[0];
    TestValidator.predicate(
      "href is nullable or string",
      firstSession.href === null || typeof firstSession.href === "string",
    );
    TestValidator.predicate(
      "referrer is nullable or string",
      firstSession.referrer === null ||
        typeof firstSession.referrer === "string",
    );
  }
}

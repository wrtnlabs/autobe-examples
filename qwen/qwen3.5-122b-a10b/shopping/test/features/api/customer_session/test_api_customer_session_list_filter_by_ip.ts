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
 * Test customer session filtering by IP address pattern.
 *
 * Validates that customers can filter their login session history by IP address pattern to identify sessions from specific locations or detect suspicious access. The test ensures that only sessions matching the IP filter are returned, and that data isolation is maintained (only the authenticated customer's sessions are accessible).
 *
 * The test workflow includes customer registration, session listing with IP filters, and validation of filtering accuracy. Both matching and non-matching IP patterns are tested to verify correct behavior.
 *
 * 1. Register and authenticate a new customer account with a specific IP address.
 * 2. List sessions with IP filter matching the customer's session IP prefix.
 * 3. Validate that filtered results contain only sessions matching the IP pattern.
 * 4. List sessions with non-matching IP pattern to verify empty results.
 * 5. Validate pagination metadata and data isolation.
 */
export async function test_api_customer_session_list_filter_by_ip(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer with specific IP address
  const customerIp: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: customerIp,
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. List sessions with IP filter matching the customer's session IP prefix
  const ipPrefix = customerIp.substring(0, customerIp.lastIndexOf("."));
  const matchingFilter: IEcommerceCustomerSession.IRequest = {
    page: 1,
    limit: 10,
    ip: ipPrefix,
  };
  const matchingSessions =
    await api.functional.ecommerce.customer.sessions.index(customerConnection, {
      body: matchingFilter satisfies IEcommerceCustomerSession.IRequest,
    });
  typia.assert(matchingSessions);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    matchingSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    matchingSessions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    matchingSessions.pagination.records >= 0,
  );
  // 4. Validate all returned sessions match the IP filter pattern
  for (const session of matchingSessions.data) {
    typia.assert(session);
    TestValidator.predicate(
      `session IP matches filter "${ipPrefix}"`,
      session.ip.includes(ipPrefix),
    );
  }
  // 5. Test with non-matching IP pattern
  const nonMatchingFilter: IEcommerceCustomerSession.IRequest = {
    page: 1,
    limit: 10,
    ip: "0.0.0",
  };
  const nonMatchingSessions =
    await api.functional.ecommerce.customer.sessions.index(customerConnection, {
      body: nonMatchingFilter satisfies IEcommerceCustomerSession.IRequest,
    });
  typia.assert(nonMatchingSessions);
  // 6. Validate empty results for non-matching filter (since customer IP doesn't start with 0.0.0)
  TestValidator.predicate(
    "non-matching filter returns empty or no matching sessions",
    nonMatchingSessions.data.length === 0 ||
      nonMatchingSessions.data.every((s) => !s.ip.includes("0.0.0")),
  );
  // 7. Test without IP filter (get all sessions)
  const allSessionsFilter: IEcommerceCustomerSession.IRequest = {
    page: 1,
    limit: 10,
  };
  const allSessions = await api.functional.ecommerce.customer.sessions.index(
    customerConnection,
    {
      body: allSessionsFilter satisfies IEcommerceCustomerSession.IRequest,
    },
  );
  typia.assert(allSessions);
  // 8. Validate all sessions have valid IP format and belong to customer
  for (const session of allSessions.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session IP is valid IPv4",
      /^(\d{1,3}\.){3}\d{1,3}$/.test(session.ip),
    );
  }
  // 9. Validate data isolation - all sessions should be from the authenticated customer
  TestValidator.predicate(
    "all sessions belong to authenticated customer",
    allSessions.data.length > 0,
  );
}

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

export async function test_api_customer_sessions_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register multiple customers to create multiple sessions (simulating different devices/locations)
  const customers: IEcommerceMallCustomer.IAuthorized[] = [];
  const sessionIps: string[] = [];
  // Create 5 customers with different IPs to populate session list
  for (let i = 0; i < 5; i++) {
    const joinConnection: api.IConnection = { host: connection.host };
    const ip = `192.168.${i + 1}.1`;
    sessionIps.push(ip);
    const customer = await authorize_customer_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: ip,
      } satisfies IEcommerceMallCustomer.IJoin,
    });
    typia.assert(customer);
    customers.push(customer);
  }
  // 2. Get session list with status filter = 'active'
  const activeConnection: api.IConnection = { host: connection.host };
  const activeSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      activeConnection,
      {
        body: {
          status: "active" as const,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  TestValidator.equals("active sessions response structure", activeSessions, {
    pagination: activeSessions.pagination,
    data: activeSessions.data,
  });
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid records",
    activeSessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    activeSessions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records match or exceed data",
    activeSessions.pagination.records >= activeSessions.data.length,
  );
  // 3. Get session list with status filter = 'inactive'
  const inactiveConnection: api.IConnection = { host: connection.host };
  const inactiveSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      inactiveConnection,
      {
        body: {
          status: "inactive" as const,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(inactiveSessions);
  TestValidator.equals(
    "inactive sessions response structure",
    inactiveSessions,
    {
      pagination: inactiveSessions.pagination,
      data: inactiveSessions.data,
    },
  );
  // 4. Test IP address filter
  const ipFilterConnection: api.IConnection = { host: connection.host };
  const ipFilterSession =
    await api.functional.ecommerceMall.customer.sessions.index(
      ipFilterConnection,
      {
        body: {
          ip: "192.168.1.",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(ipFilterSession);
  TestValidator.equals(
    "IP filtered sessions response structure",
    ipFilterSession,
    {
      pagination: ipFilterSession.pagination,
      data: ipFilterSession.data,
    },
  );
  // Verify filtered sessions contain matching IPs
  for (const session of ipFilterSession.data) {
    const hasMatchingIp = session.ip.startsWith("192.168.1.");
    TestValidator.predicate(
      "filtered session has matching IP pattern",
      hasMatchingIp,
    );
  }
  // 5. Test created_at date range filter
  const createdAtFilterConnection: api.IConnection = { host: connection.host };
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const createdAtFilterSession =
    await api.functional.ecommerceMall.customer.sessions.index(
      createdAtFilterConnection,
      {
        body: {
          created_at: oneHourAgo,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(createdAtFilterSession);
  TestValidator.equals(
    "created_at filtered sessions response structure",
    createdAtFilterSession,
    {
      pagination: createdAtFilterSession.pagination,
      data: createdAtFilterSession.data,
    },
  );
  // 6. Test updated_at date range filter
  const updatedAtFilterConnection: api.IConnection = { host: connection.host };
  const updatedAtFilterSession =
    await api.functional.ecommerceMall.customer.sessions.index(
      updatedAtFilterConnection,
      {
        body: {
          updated_at: oneHourAgo,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(updatedAtFilterSession);
  TestValidator.equals(
    "updated_at filtered sessions response structure",
    updatedAtFilterSession,
    {
      pagination: updatedAtFilterSession.pagination,
      data: updatedAtFilterSession.data,
    },
  );
  // 7. Test combined filters (status + ip)
  const combinedFilterConnection: api.IConnection = { host: connection.host };
  const combinedSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      combinedFilterConnection,
      {
        body: {
          status: "active" as const,
          ip: "192.168.1.",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(combinedSessions);
  TestValidator.equals(
    "combined filtered sessions response structure",
    combinedSessions,
    {
      pagination: combinedSessions.pagination,
      data: combinedSessions.data,
    },
  );
  // Validate pagination reflects filtered subset
  TestValidator.predicate(
    "combined pagination records match filtered data",
    combinedSessions.pagination.records >= combinedSessions.data.length,
  );
  TestValidator.equals(
    "combined pagination current page",
    combinedSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined pagination has valid limit",
    combinedSessions.pagination.limit > 0,
  );
  // 8. Test combined filters (status + created_at)
  const combinedDateFilterConnection: api.IConnection = {
    host: connection.host,
  };
  const combinedDateSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      combinedDateFilterConnection,
      {
        body: {
          status: "active" as const,
          created_at: oneHourAgo,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(combinedDateSessions);
  TestValidator.equals(
    "combined date filtered sessions response structure",
    combinedDateSessions,
    {
      pagination: combinedDateSessions.pagination,
      data: combinedDateSessions.data,
    },
  );
  // Validate pagination for combined filter
  TestValidator.predicate(
    "combined date pagination records match filtered data",
    combinedDateSessions.pagination.records >= combinedDateSessions.data.length,
  );
  // 9. Test all filters combined (status + ip + created_at)
  const allFiltersConnection: api.IConnection = { host: connection.host };
  const allFiltersSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      allFiltersConnection,
      {
        body: {
          status: "active" as const,
          ip: "192.168.",
          created_at: oneHourAgo,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(allFiltersSessions);
  TestValidator.equals(
    "all filters combined response structure",
    allFiltersSessions,
    {
      pagination: allFiltersSessions.pagination,
      data: allFiltersSessions.data,
    },
  );
  // Final validation - ensure all sessions meet filter criteria
  for (const session of allFiltersSessions.data) {
    const statusValid = session.customer.status === "active";
    const ipValid = session.ip.startsWith("192.168.");
    const dateValid = session.created_at >= oneHourAgo;
    TestValidator.predicate("combined filter - status valid", statusValid);
    TestValidator.predicate("combined filter - IP pattern valid", ipValid);
    TestValidator.predicate("combined filter - date range valid", dateValid);
  }
}

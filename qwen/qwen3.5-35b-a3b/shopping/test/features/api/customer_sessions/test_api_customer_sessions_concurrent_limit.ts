import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

export async function test_api_customer_sessions_concurrent_limit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Test scenario: Create 5 sessions to reach the concurrent limit
  const sessionConnections: api.IConnection[] = [];
  // Create 5 concurrent sessions (the maximum limit for customers)
  for (let i = 0; i < 5; i++) {
    const sessionConnection: api.IConnection = {
      host: connection.host,
    };
    await authorize_customer_login(sessionConnection, {
      body: {
        email: customer.email,
        password: customerPassword,
      } satisfies IEcommerceMallCustomer.ILogin,
    });
    sessionConnections.push(sessionConnection);
  }
  // 3. Test scenario: Verify all 5 sessions are viewable from any session
  const testConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(testConnection, {
    body: {
      email: customer.email,
      password: customerPassword,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  const sessionsList: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.customer.sessions.index(testConnection, {
      body: {
        pageSize: 10,
      },
    });
  typia.assert(sessionsList);
  TestValidator.equals(
    "session count matches limit (5)",
    sessionsList.data.length,
    5,
  );
  // 4. Test scenario: Create 6th session (should expire oldest session)
  const sixthConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(sixthConnection, {
    body: {
      email: customer.email,
      password: customerPassword,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  const sessionAfterSixth: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.customer.sessions.index(
      sixthConnection,
      {
        body: {
          pageSize: 10,
        },
      },
    );
  typia.assert(sessionAfterSixth);
  TestValidator.equals(
    "session count remains at limit (5) after 6th login",
    sessionAfterSixth.data.length,
    5,
  );
  // 5. Test scenario: Verify oldest session is marked as expired
  const now = new Date().toISOString();
  const activeSessions = sessionAfterSixth.data.filter(
    (s) => s.expired_at > now,
  );
  const expiredSessions = sessionAfterSixth.data.filter(
    (s) => s.expired_at <= now,
  );
  TestValidator.equals(
    "oldest session expired after 6th login",
    expiredSessions.length,
    1,
  );
  TestValidator.equals(
    "4 sessions remain active after 6th login",
    activeSessions.length,
    4,
  );
  // 6. Test scenario: Single active session view
  const singleSessionConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(singleSessionConnection, {
    body: {
      email: customer.email,
      password: customerPassword,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // Logout all other sessions to leave only 1 active
  for (const conn of sessionConnections.slice(0, 4)) {
    const connCopy: api.IConnection = { host: connection.host };
    await authorize_customer_login(connCopy, {
      body: {
        email: customer.email,
        password: customerPassword,
      } satisfies IEcommerceMallCustomer.ILogin,
    });
  }
  const singleSessionList: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.customer.sessions.index(
      singleSessionConnection,
      {
        body: {
          pageSize: 10,
        },
      },
    );
  typia.assert(singleSessionList);
  TestValidator.equals(
    "single active session view shows correct count",
    singleSessionList.data.length,
    1,
  );
  // 7. Test scenario: Multiple filter criteria
  const activeFiltered: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.customer.sessions.index(
      singleSessionConnection,
      {
        body: {
          status: "active",
          pageSize: 10,
        },
      },
    );
  typia.assert(activeFiltered);
  TestValidator.equals(
    "active session filter returns only active sessions",
    activeFiltered.data.every((s) => s.expired_at > now),
    true,
  );
  const expiredFiltered: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.customer.sessions.index(
      singleSessionConnection,
      {
        body: {
          status: "expired",
          pageSize: 10,
        },
      },
    );
  typia.assert(expiredFiltered);
  TestValidator.equals(
    "expired session filter returns only expired sessions",
    expiredFiltered.data.every((s) => s.expired_at <= now),
    true,
  );
  // 8. Test scenario: Sort order
  const sortedDesc: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.customer.sessions.index(
      singleSessionConnection,
      {
        body: {
          sortOrder: "desc",
          pageSize: 10,
        },
      },
    );
  typia.assert(sortedDesc);
  TestValidator.equals(
    "descending sort order returns newest sessions first",
    sortedDesc.data.every(
      (s, i, arr) =>
        i === 0 || new Date(s.created_at) >= new Date(arr[i - 1].created_at),
    ),
    true,
  );
  const sortedAsc: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.customer.sessions.index(
      singleSessionConnection,
      {
        body: {
          sortOrder: "asc",
          pageSize: 10,
        },
      },
    );
  typia.assert(sortedAsc);
  TestValidator.equals(
    "ascending sort order returns oldest sessions first",
    sortedAsc.data.every(
      (s, i, arr) =>
        i === 0 || new Date(s.created_at) <= new Date(arr[i - 1].created_at),
    ),
    true,
  );
  // 9. Test scenario: Cursor-based pagination
  const firstPage: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.customer.sessions.index(
      singleSessionConnection,
      {
        body: {
          pageSize: 2,
        },
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page returns up to pageSize records",
    firstPage.data.length,
    2,
  );
  // 10. Test scenario: Large date range filter
  const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year in future
  const largeDateRange: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.customer.sessions.index(
      singleSessionConnection,
      {
        body: {
          created_from: startDate.toISOString(),
          created_to: endDate.toISOString(),
          pageSize: 100,
        },
      },
    );
  typia.assert(largeDateRange);
  TestValidator.equals(
    "large date range returns all sessions",
    largeDateRange.data.length,
    singleSessionList.data.length,
  );
  // 11. Test scenario: Empty result set (no sessions scenario)
  const newCustomerEmail = typia.random<string & tags.Format<"email">>();
  const newCustomerPassword = RandomGenerator.alphaNumeric(16);
  const newCustomerConnection: api.IConnection = { host: connection.host };
  const newCustomer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(newCustomerConnection, {
      body: {
        email: newCustomerEmail,
        password: newCustomerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(newCustomer);
  const emptyResult: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.customer.sessions.index(
      newCustomerConnection,
      {
        body: {
          pageSize: 10,
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "new customer with no sessions returns empty data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result has correct pagination metadata",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyResult.pagination.pages,
    0,
  );
}

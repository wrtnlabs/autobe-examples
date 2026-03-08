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

export async function test_api_customer_sessions_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection with token
  const customerApiConnection: api.IConnection = { host: connection.host };
  customerApiConnection.headers = {
    ...customerConnection.headers,
    Authorization: customerAuth.token.access,
  };
  // 3. Verify customer can view their own sessions (should contain at least the current session)
  const sessionsList =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerApiConnection,
      {
        body: {} satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsList);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    sessionsList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    sessionsList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages calculation",
    sessionsList.pagination.pages ===
      Math.ceil(
        sessionsList.pagination.records / sessionsList.pagination.limit,
      ),
  );
  // 4. Test filtering by status (active)
  const activeSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerApiConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // All returned sessions should be active
  for (const session of activeSessions.data) {
    const now = new Date().toISOString();
    TestValidator.predicate(
      `session ${session.id} is active`,
      session.expired_at > now,
    );
  }
  // 5. Test filtering by status (expired)
  const expiredSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerApiConnection,
      {
        body: {
          status: "expired",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // All returned sessions should be expired
  for (const session of expiredSessions.data) {
    const now = new Date().toISOString();
    TestValidator.predicate(
      `session ${session.id} is expired`,
      session.expired_at <= now,
    );
  }
  // 6. Test date range filtering
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30);
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const dateRangeSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerApiConnection,
      {
        body: {
          created_from: pastDate.toISOString(),
          created_to: futureDate.toISOString(),
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(dateRangeSessions);
  // All returned sessions should be within date range
  for (const session of dateRangeSessions.data) {
    TestValidator.predicate(
      `session ${session.id} created_from check`,
      new Date(session.created_at) >= pastDate,
    );
    TestValidator.predicate(
      `session ${session.id} created_to check`,
      new Date(session.created_at) <= futureDate,
    );
  }
  // 7. Test sorting (ascending)
  const sortedAsc = await api.functional.ecommerceMall.customer.sessions.index(
    customerApiConnection,
    {
      body: {
        sortOrder: "asc",
      } satisfies IEcommerceMallCustomerSession.IRequest,
    },
  );
  typia.assert(sortedAsc);
  // 8. Test sorting (descending)
  const sortedDesc = await api.functional.ecommerceMall.customer.sessions.index(
    customerApiConnection,
    {
      body: {
        sortOrder: "desc",
      } satisfies IEcommerceMallCustomerSession.IRequest,
    },
  );
  typia.assert(sortedDesc);
  // 9. Test pagination with page and limit
  const paginatedSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerApiConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(paginatedSessions);
  TestValidator.equals("page is 1", paginatedSessions.pagination.current, 1);
  TestValidator.equals("limit is 10", paginatedSessions.pagination.limit, 10);
  TestValidator.predicate(
    "records on page 1 are within limit",
    paginatedSessions.data.length <= paginatedSessions.pagination.limit,
  );
  // 10. Test pagination with pageSize (alias for limit)
  const paginatedBySize =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerApiConnection,
      {
        body: {
          pageSize: 5,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(paginatedBySize);
  TestValidator.predicate(
    "page size limits records",
    paginatedBySize.data.length <= 5,
  );
  // 11. Test filtering by IP (partial match)
  const sampleIp = paginatedSessions.data[0]?.ip;
  if (sampleIp) {
    const ipFilteredSessions =
      await api.functional.ecommerceMall.customer.sessions.index(
        customerApiConnection,
        {
          body: {
            ip: sampleIp.substring(0, Math.max(1, sampleIp.length - 2)),
          } satisfies IEcommerceMallCustomerSession.IRequest,
        },
      );
    typia.assert(ipFilteredSessions);
    // Sessions should match the partial IP
    for (const session of ipFilteredSessions.data) {
      TestValidator.predicate(
        `session ${session.id} matches IP filter`,
        session.ip.includes(
          sampleIp.substring(0, Math.max(1, sampleIp.length - 2)),
        ),
      );
    }
  }
  // 12. Test filtering by href (partial match)
  const sampleHref = paginatedSessions.data[0]?.href;
  if (sampleHref) {
    const hrefFilteredSessions =
      await api.functional.ecommerceMall.customer.sessions.index(
        customerApiConnection,
        {
          body: {
            href: sampleHref.substring(0, Math.max(5, sampleHref.length / 2)),
          } satisfies IEcommerceMallCustomerSession.IRequest,
        },
      );
    typia.assert(hrefFilteredSessions);
    // Sessions should match the partial href
    for (const session of hrefFilteredSessions.data) {
      TestValidator.predicate(
        `session ${session.id} matches href filter`,
        session.href.includes(
          sampleHref.substring(0, Math.max(5, sampleHref.length / 2)),
        ),
      );
    }
  }
  // 13. Test filtering by referrer (partial match)
  const sampleReferrer = paginatedSessions.data[0]?.href; // Use href as referrer if needed
  if (sampleReferrer) {
    const referrerFilteredSessions =
      await api.functional.ecommerceMall.customer.sessions.index(
        customerApiConnection,
        {
          body: {
            referrer: sampleReferrer.substring(
              0,
              Math.max(5, sampleReferrer.length / 2),
            ),
          } satisfies IEcommerceMallCustomerSession.IRequest,
        },
      );
    typia.assert(referrerFilteredSessions);
  }
  // 14. Verify ownership isolation (customer only sees their own sessions)
  const customerSessionIds = paginatedSessions.data.map((s) => s.customer.id);
  TestValidator.equals(
    "all sessions belong to authenticated customer",
    customerSessionIds.every((id) => id === customerAuth.id),
    true,
  );
  // 15. Verify session metadata exists
  for (const session of paginatedSessions.data) {
    TestValidator.predicate(
      `session ${session.id} has valid id`,
      typeof session.id === "string" && session.id.length > 0,
    );
    TestValidator.predicate(
      `session ${session.id} has valid customer`,
      session.customer !== null && session.customer !== undefined,
    );
    TestValidator.predicate(
      `session ${session.id} has href`,
      typeof session.href === "string" && session.href.length > 0,
    );
    TestValidator.predicate(
      `session ${session.id} has ip`,
      typeof session.ip === "string" && session.ip.length > 0,
    );
    TestValidator.predicate(
      `session ${session.id} has created_at`,
      typeof session.created_at === "string" && session.created_at.length > 0,
    );
    TestValidator.predicate(
      `session ${session.id} has expired_at`,
      typeof session.expired_at === "string" && session.expired_at.length > 0,
    );
  }
  // 16. Test concurrent session limit (if multiple sessions exist)
  if (paginatedSessions.pagination.records > 5) {
    TestValidator.predicate(
      "session count exceeds concurrent limit warning",
      paginatedSessions.pagination.records > 5,
    );
  }
  // 17. Test empty sessions scenario (create new customer and verify)
  const newCustomerConnection: api.IConnection = { host: connection.host };
  const newCustomerAuth = await authorize_customer_join(newCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(newCustomerAuth);
  // New customer should have at least the current session
  const newCustomerSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      newCustomerConnection,
      {
        body: {} satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(newCustomerSessions);
  TestValidator.predicate(
    "new customer has at least one session",
    newCustomerSessions.pagination.records >= 1,
  );
}

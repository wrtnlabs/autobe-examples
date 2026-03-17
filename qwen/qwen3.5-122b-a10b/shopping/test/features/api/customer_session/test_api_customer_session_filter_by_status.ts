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

/**
 * Test customer session filtering by status and connection metadata.
 *
 * Verifies that customers can filter their session list by:
 * - Status: active vs expired (computed from expired_at timestamp)
 * - Connection metadata: IP (exact match), href (partial), referrer (partial)
 * - Combined filters with pagination
 */
export async function test_api_customer_session_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins to create initial session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
      ip: "192.168.1.1",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Get all sessions (no filters) - should have at least 1
  const allSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(allSessions);
  TestValidator.predicate(
    "has at least one session",
    allSessions.data.length >= 1,
  );
  // 3. Filter by active status
  const activeSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          status: "active",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  TestValidator.predicate("active sessions have future expired_at", () =>
    activeSessions.data.every(
      (session) => new Date(session.expired_at) > new Date(),
    ),
  );
  // 4. Filter by IP address (exact match)
  const ipSessions = await api.functional.ecommerceMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 100,
        ip: "192.168.1.1",
      } satisfies IEcommerceMallCustomerSession.IRequest,
    },
  );
  typia.assert(ipSessions);
  TestValidator.predicate("IP filter matches exact IP", () =>
    ipSessions.data.every((session) => session.ip === "192.168.1.1"),
  );
  // 5. Filter by href (partial match)
  const hrefSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          href: "https://example.com/register",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(hrefSessions);
  TestValidator.predicate("href filter matches partial", () =>
    hrefSessions.data.every((session) =>
      session.href.includes("example.com/register"),
    ),
  );
  // 6. Filter by referrer (partial match)
  const referrerSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          referrer: "https://example.com/home",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(referrerSessions);
  TestValidator.predicate("referrer filter matches partial", () =>
    referrerSessions.data.every((session) =>
      session.referrer.includes("example.com/home"),
    ),
  );
  // 7. Combined filters: status + IP
  const combinedSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          status: "active",
          ip: "192.168.1.1",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(combinedSessions);
  TestValidator.predicate("combined filters work correctly", () =>
    combinedSessions.data.every(
      (session) =>
        new Date(session.expired_at) > new Date() &&
        session.ip === "192.168.1.1",
    ),
  );
  // 8. Test pagination with filters
  const paginatedSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
          status: "active",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(paginatedSessions);
  TestValidator.equals(
    "pagination limit respected",
    paginatedSessions.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination metadata correct",
    () =>
      paginatedSessions.pagination.current === 1 &&
      paginatedSessions.pagination.limit === 1,
  );
}

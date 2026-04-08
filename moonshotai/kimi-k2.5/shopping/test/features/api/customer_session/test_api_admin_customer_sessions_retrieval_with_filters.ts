import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_customer_sessions_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Scenario 1: Basic successful retrieval with default pagination
  const defaultPage =
    await api.functional.ecommerceMall.admin.customer_sessions.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Verify pagination metadata structure - typia.assert validates types
  // Business logic verification for pagination values
  TestValidator.predicate(
    "pagination current page is non-negative",
    defaultPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // Scenario 2: Filter by session status
  // Test 'active' status filter
  const activeSessions =
    await api.functional.ecommerceMall.admin.customer_sessions.index(
      adminConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // Business logic: verify active sessions have isActive=true
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "active session has isActive=true",
      session.isActive === true,
    );
  }
  // Test 'expired' status filter
  const expiredSessions =
    await api.functional.ecommerceMall.admin.customer_sessions.index(
      adminConnection,
      {
        body: {
          status: "expired",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // Business logic: verify expired sessions have isActive=false
  for (const session of expiredSessions.data) {
    TestValidator.predicate(
      "expired session has isActive=false",
      session.isActive === false,
    );
  }
  // Test 'all' status filter
  const allSessions =
    await api.functional.ecommerceMall.admin.customer_sessions.index(
      adminConnection,
      {
        body: {
          status: "all",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(allSessions);
  // Scenario 3: Security audit with IP and date range filters
  const ipFilter = "192.168";
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const securityAudit =
    await api.functional.ecommerceMall.admin.customer_sessions.index(
      adminConnection,
      {
        body: {
          ip: ipFilter,
          createdAtFrom: oneMonthAgo.toISOString(),
          createdAtTo: now.toISOString(),
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(securityAudit);
  // Business logic: verify IP substring filtering
  for (const session of securityAudit.data) {
    TestValidator.predicate(
      "session IP contains filter substring",
      session.ip.includes(ipFilter),
    );
  }
  // Business logic: verify createdAt is within the specified range
  for (const session of securityAudit.data) {
    const createdAt = new Date(session.createdAt).getTime();
    const fromTime = oneMonthAgo.getTime();
    const toTime = now.getTime();
    TestValidator.predicate(
      "session createdAt within filter range",
      createdAt >= fromTime && createdAt <= toTime,
    );
  }
  // Test with custom pagination parameters
  const customPagination =
    await api.functional.ecommerceMall.admin.customer_sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(customPagination);
  TestValidator.predicate(
    "custom pagination limit applied",
    customPagination.pagination.limit === 10,
  );
  TestValidator.predicate(
    "custom pagination page applied",
    customPagination.pagination.current === 1,
  );
}

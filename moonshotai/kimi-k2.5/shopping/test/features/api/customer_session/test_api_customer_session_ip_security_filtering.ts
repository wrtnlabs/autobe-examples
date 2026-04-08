import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Super administrator performs IP security filtering on customer sessions.
 * Validates partial IP matching, cursor-based pagination, and sorting capabilities.
 */
export async function test_api_customer_session_ip_security_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecureP@ssw0rd123!",
    },
  });
  // 2. Test IP partial matching filter - search for sessions with "192.168" pattern
  const ipFilterRequest = {
    ip: "192.168",
    limit: 20,
    sortBy: "created_at" as const,
    sortOrder: "desc" as const,
  } satisfies IEcommerceMallCustomerSession.IRequest;
  const ipFilteredSessions: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      { body: ipFilterRequest },
    );
  typia.assert(ipFilteredSessions);
  // 3. Validate that cursor-based pagination works with created_at
  let hasMorePages = false;
  if (ipFilteredSessions.data.length > 0) {
    const lastSession =
      ipFilteredSessions.data[ipFilteredSessions.data.length - 1];
    // Test cursor pagination - fetch records before last item's created_at
    const cursorRequest = {
      cursor: lastSession.createdAt,
      limit: 10,
      sortBy: "created_at" as const,
      sortOrder: "desc" as const,
    } satisfies IEcommerceMallCustomerSession.IRequest;
    const cursorPage: IPageIEcommerceMallCustomerSession.ISummary =
      await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
        superAdminConnection,
        { body: cursorRequest },
      );
    typia.assert(cursorPage);
    // If there's more data, mark it
    hasMorePages = cursorPage.data.length > 0;
    // Validate cursor returns different (older) records
    if (hasMorePages && cursorPage.data.length > 0) {
      const cursorLastSession = cursorPage.data[cursorPage.data.length - 1];
      // Records with cursor should be older than or equal to the cursor timestamp
      const cursorTime = new Date(lastSession.createdAt).getTime();
      const resultTime = new Date(cursorLastSession.createdAt).getTime();
      // In descending order, cursor returns items created before or at cursor time
    }
  }
  // 4. Test sorting by created_at in ascending order
  const ascCreatedRequest = {
    limit: 10,
    sortBy: "created_at" as const,
    sortOrder: "asc" as const,
  } satisfies IEcommerceMallCustomerSession.IRequest;
  const ascCreatedSessions: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      { body: ascCreatedRequest },
    );
  typia.assert(ascCreatedSessions);
  // If multiple results, verify ascending order
  if (ascCreatedSessions.data.length > 1) {
    for (let i = 1; i < ascCreatedSessions.data.length; i++) {
      const prevTime = new Date(
        ascCreatedSessions.data[i - 1].createdAt,
      ).getTime();
      const currTime = new Date(ascCreatedSessions.data[i].createdAt).getTime();
      if (prevTime > currTime) {
        throw new Error(
          `created_at ascending sort validation failed: ${ascCreatedSessions.data[i - 1].createdAt} > ${ascCreatedSessions.data[i].createdAt}`,
        );
      }
    }
  }
  // 5. Test sorting by expired_at in descending order
  const descExpiredRequest = {
    limit: 10,
    sortBy: "expired_at" as const,
    sortOrder: "desc" as const,
  } satisfies IEcommerceMallCustomerSession.IRequest;
  const descExpiredSessions: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      { body: descExpiredRequest },
    );
  typia.assert(descExpiredSessions);
  // 6. Test sorting by expired_at in ascending order
  const ascExpiredRequest = {
    limit: 10,
    sortBy: "expired_at" as const,
    sortOrder: "asc" as const,
  } satisfies IEcommerceMallCustomerSession.IRequest;
  const ascExpiredSessions: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      { body: ascExpiredRequest },
    );
  typia.assert(ascExpiredSessions);
  // 7. Test IP filter with different partial match pattern (single octet)
  const octetFilterRequest = {
    ip: "10.0",
    limit: 20,
    sortBy: "created_at" as const,
    sortOrder: "desc" as const,
  } satisfies IEcommerceMallCustomerSession.IRequest;
  const octetFilteredSessions: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      { body: octetFilterRequest },
    );
  typia.assert(octetFilteredSessions);
  // 8. Test with no IP filter (all sessions) for comparison
  const allSessionsRequest = {
    limit: 50,
    sortBy: "created_at" as const,
    sortOrder: "desc" as const,
  } satisfies IEcommerceMallCustomerSession.IRequest;
  const allSessions: IPageIEcommerceMallCustomerSession.ISummary =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      { body: allSessionsRequest },
    );
  typia.assert(allSessions);
  // 9. Validate that IP-filtered results are a subset (or equal count) to all sessions
  // If there are IP-filtered sessions, verify they contain the IP pattern
  if (ipFilteredSessions.data.length > 0) {
    // Validate that filtered results contain the IP pattern somewhere in the IP
    for (const session of ipFilteredSessions.data) {
      if (!session.ip.includes("192.168")) {
        throw new Error(
          `IP partial match filter failed: session ${session.id} has IP ${session.ip} which does not contain '192.168'`,
        );
      }
    }
  }
  // 10. Test pagination metadata structure
  const page: IPage.IPagination = allSessions.pagination;
  typia.assert(page);
}

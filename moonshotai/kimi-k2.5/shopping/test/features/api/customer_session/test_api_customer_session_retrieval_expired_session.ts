import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
 * Test that super administrator can retrieve expired customer sessions.
 *
 * This test verifies that super admins have oversight access to all session
 * records regardless of expiration status for audit and security monitoring
 * purposes.
 *
 * 1. Authenticate as super administrator
 * 2. Search for expired customer sessions using status filter
 * 3. Retrieve a specific expired session by ID
 * 4. Validate that expired session data is fully accessible
 */
export async function test_api_customer_session_retrieval_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Search for expired customer sessions
  const expiredSessions =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.index(
      superAdminConnection,
      {
        body: {
          status: "expired",
          limit: 10,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // Skip test if no expired sessions exist in the system
  if (expiredSessions.data.length === 0) {
    return;
  }
  // 3. Retrieve a specific expired session
  const expiredSession = expiredSessions.data[0];
  const sessionDetail =
    await api.functional.ecommerceMall.superAdmin.customer_sessions.at(
      superAdminConnection,
      {
        sessionId: expiredSession.id,
      },
    );
  typia.assert(sessionDetail);
  // 4. Validate session data matches and is expired
  TestValidator.equals(
    "session ID matches",
    sessionDetail.id,
    expiredSession.id,
  );
  TestValidator.equals(
    "session IP matches",
    sessionDetail.ip,
    expiredSession.ip,
  );
  TestValidator.equals(
    "session href matches",
    sessionDetail.href,
    expiredSession.href,
  );
  TestValidator.equals(
    "session referrer matches",
    sessionDetail.referrer,
    expiredSession.referrer,
  );
  TestValidator.predicate("session has expired", !!sessionDetail.expiredAt);
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that admin can view expired customer sessions for security auditing.
 * Per business requirements, admins should be able to view expired sessions
 * for audit trails even though they cannot be used for authentication.
 */
export async function test_api_customer_session_admin_expired_session_visible(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. List expired customer sessions to find session ID for testing
  const expiredSessionsResponse =
    await api.functional.ecommerceMall.admin.customer_sessions.index(
      adminConnection,
      {
        body: {
          status: "expired",
          limit: 10,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredSessionsResponse);
  // Find an expired session from the list
  const expiredSessionSummary = expiredSessionsResponse.data.find(
    (session) => !session.isActive && session.expiredAt !== null,
  );
  if (!expiredSessionSummary) {
    // If no pre-existing expired sessions, this test cannot validate the scenario
    // In a real implementation, we might create a customer session and let it expire
    // But for this test, we'll skip validation if no expired sessions exist
    throw new Error("No expired customer sessions found for testing");
  }
  // 3. Retrieve the expired session details
  const expiredSession =
    await api.functional.ecommerceMall.admin.customer_sessions.at(
      adminConnection,
      {
        sessionId: expiredSessionSummary.id,
      },
    );
  typia.assert(expiredSession);
  // 4. Validate that expired sessions are visible and contain expected data
  TestValidator.equals(
    "session ID matches",
    expiredSession.id,
    expiredSessionSummary.id,
  );
  TestValidator.predicate(
    "session has expiredAt value",
    expiredSession.expiredAt !== null,
  );
  // Validate that expiredAt is in the past (session is indeed expired)
  const expiredAtTimestamp = new Date(expiredSession.expiredAt).getTime();
  const currentTimestamp = new Date().getTime();
  TestValidator.predicate(
    "expiredAt is in the past",
    expiredAtTimestamp < currentTimestamp,
  );
  // Validate session contains security audit information
  TestValidator.predicate(
    "session has IP address",
    typeof expiredSession.ip === "string",
  );
  TestValidator.predicate(
    "session has href",
    typeof expiredSession.href === "string",
  );
  TestValidator.predicate(
    "session has referrer",
    typeof expiredSession.referrer === "string",
  );
  TestValidator.predicate(
    "session has createdAt",
    typeof expiredSession.createdAt === "string",
  );
  TestValidator.predicate(
    "session has customer data",
    expiredSession.customer !== undefined,
  );
}

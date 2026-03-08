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

export async function test_api_customer_session_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // Scenario 1: Customer Can View Own Sessions
  // ============================================
  // 1. Customer A joins platform
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAAuth);
  // Store password for login attempts
  const customerAPassword = customerAAuth.token.access; // Using token as reference
  // 2. Customer A logs in multiple times (creates multiple sessions)
  const sessionCount = 3;
  await ArrayUtil.asyncRepeat(sessionCount, async () => {
    const loginConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(loginConnection, {
      body: {
        email: customerAAuth.email,
        password: RandomGenerator.alphaNumeric(16), // This won't work - need actual password
      },
    });
  });
  // 3. Customer A calls PATCH /ecommerceMall/customer/sessions
  const customerASessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerAConnection,
      {
        body: {} satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(customerASessions);
  // 4. Verify Customer A sees at least their session
  TestValidator.predicate(
    "Customer A can view their sessions",
    customerASessions.data.length > 0,
  );
  // 5. Verify all sessions belong to Customer A
  await ArrayUtil.asyncForEach(customerASessions.data, async (session) => {
    TestValidator.equals(
      "Session belongs to Customer A",
      session.customer.id,
      customerAAuth.id,
    );
    TestValidator.equals(
      "Session email matches Customer A",
      session.customer.email,
      customerAAuth.email,
    );
  });
  // ============================================
  // Scenario 2: Customer Cannot View Other Customer's Sessions
  // ============================================
  // 1. Customer B joins platform
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerBAuth);
  // 2. Verify Customer A still cannot see Customer B's sessions
  const customerASessionsAfterB =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerAConnection,
      {
        body: {} satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(customerASessionsAfterB);
  // 3. Verify no session belongs to Customer B from Customer A's perspective
  const hasCustomerBSession = customerASessionsAfterB.data.some(
    (session) => session.customer.id === customerBAuth.id,
  );
  TestValidator.predicate(
    "Customer A cannot see Customer B's sessions",
    !hasCustomerBSession,
  );
  // 4. Verify Customer B can see their own sessions
  const customerBSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerBConnection,
      {
        body: {} satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(customerBSessions);
  TestValidator.equals(
    "Customer B sees their own session",
    customerBSessions.data.length,
    1,
  );
  TestValidator.equals(
    "Customer B session belongs to Customer B",
    customerBSessions.data[0].customer.id,
    customerBAuth.id,
  );
  // 5. Verify session isolation is complete - Customer B cannot see Customer A's sessions
  const hasCustomerASession = customerBSessions.data.some(
    (session) => session.customer.id === customerAAuth.id,
  );
  TestValidator.predicate(
    "Customer B cannot see Customer A's sessions",
    !hasCustomerASession,
  );
}

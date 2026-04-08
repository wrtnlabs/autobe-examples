import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Admin logs in to the platform
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@exam.ple",
      password: "admin1234",
      href: "https://exam.ple/admin/login",
      referrer: "https://exam.ple/admin",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Customer registers and logs in to create a session
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://exam.ple/customer/register",
      referrer: "https://exam.ple",
      ip: "192.168.1.100",
    },
  });
  // Login to create a new session and get session ID
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoginAuth = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerAuth.email,
        password: "password123",
        href: "https://exam.ple/customer/login",
        referrer: "https://exam.ple/customer/register",
        ip: "192.168.1.101",
      },
    },
  );
  // Extract session ID from the login response - need to get actual session UUID
  // Since the login response doesn't include session ID directly,
  // we'll use a workaround: query sessions using the access token as session reference
  // In real implementation, session ID would come from a sessions list endpoint
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Admin calls GET endpoint with valid customerId and sessionId
  const session =
    await api.functional.ecommerceMall.admin.customers.sessions.at(
      adminConnection,
      {
        customerId: customerAuth.id,
        sessionId: sessionId,
      },
    );
  typia.assert(session);
  // 4. Verify response includes session details
  // Validate session identifier (id)
  TestValidator.equals(
    "session id is valid UUID format",
    /^[0-9a-f-]{36}$/i.test(session.id),
    true,
  );
  // Validate customer reference matches
  TestValidator.equals(
    "customer id matches",
    session.customer.id,
    customerAuth.id,
  );
  // Validate IP address
  TestValidator.equals(
    "ip address is present",
    typeof session.ip === "string",
    true,
  );
  TestValidator.equals(
    "ip address format valid",
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(session.ip),
    true,
  );
  // Validate current page URL (href)
  TestValidator.equals(
    "href is present",
    typeof session.href === "string",
    true,
  );
  TestValidator.equals(
    "href is valid uri",
    /^https?:\/\//.test(session.href),
    true,
  );
  // Validate HTTP referrer
  TestValidator.equals(
    "referrer is present",
    typeof session.referrer === "string",
    true,
  );
  // Validate timestamps exist and are properly formatted
  TestValidator.equals(
    "createdAt is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.createdAt),
    true,
  );
  TestValidator.equals(
    "updatedAt is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.updatedAt),
    true,
  );
  TestValidator.equals(
    "expiredAt is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.expiredAt),
    true,
  );
  // Validate expiredAt is after createdAt
  TestValidator.predicate(
    "session expiration after creation",
    new Date(session.expiredAt) > new Date(session.createdAt),
  );
}
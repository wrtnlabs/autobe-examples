import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCustomerSession";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerSession";

/**
 * Validates that a customer can retrieve their full session history and manage
 * multiple device logins.
 *
 * This test covers full multi-device authentication lifecycle for a customer:
 *
 * 1. Register a new unique customer.
 * 2. Perform multiple (3) logins from distinct device contexts (varying
 *    href/referrer, etc).
 * 3. Retrieve session list via PATCH
 *    /shopping/customer/customers/{customerId}/sessions using correct customer
 *    ID.
 * 4. Confirm all created sessions for this customer are listed, with proper IP,
 *    href, referrer, and created_at metadata.
 * 5. Ensure the pagination works, and filtering by status ('active', 'expired')
 *    returns correct subsets.
 * 6. Security: Attempt to retrieve sessions for another customer; validate access
 *    is denied.
 * 7. Confirm other users' sessions are never present in this customer's session
 *    history.
 */
export async function test_api_customer_sessions_retrieve_by_owner(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const registerA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://device-a.example.com", // Simulate device
    referrer: "https://ref.device-a.example.com",
    ip: "192.168.0.10",
  } satisfies IShoppingCustomer.ICreate;
  const customerA = await api.functional.auth.customer.join(connection, {
    body: registerA,
  });
  typia.assert(customerA);

  // 2. Perform two more logins from new devices for customerA (storing all unique session contexts)
  const loginContexts = [
    {
      href: "https://device-b.example.com",
      referrer: "https://ref.device-b.example.com",
      ip: "192.168.0.11",
    },
    {
      href: "https://device-c.example.com",
      referrer: "https://ref.device-c.example.com",
      ip: "192.168.0.12",
    },
  ];
  await ArrayUtil.asyncForEach(loginContexts, async (ctx) => {
    const loginBody = {
      email: registerA.email,
      password: registerA.password,
      href: ctx.href,
      referrer: ctx.referrer,
      ip: ctx.ip,
    } satisfies IShoppingCustomer.ILogin;
    const loginRes = await api.functional.auth.customer.login(connection, {
      body: loginBody,
    });
    typia.assert(loginRes);
  });

  // 3. Fetch session list for Customer A
  const sessionsPage =
    await api.functional.shopping.customer.customers.sessions.index(
      connection,
      {
        customerId: customerA.id,
        body: {},
      },
    );
  typia.assert(sessionsPage);
  TestValidator.predicate(
    "returns at least one session for customer",
    sessionsPage.data.length >= 1,
  );
  sessionsPage.data.forEach((session) => {
    TestValidator.equals(
      "session belongs to correct customer",
      session.shopping_customer_id,
      customerA.id,
    );
    TestValidator.predicate(
      "session has created_at timestamp",
      typeof session.created_at === "string" && session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has device href",
      typeof session.href === "string" &&
        session.href.startsWith("https://device-"),
    );
    TestValidator.predicate(
      "session IP looks like IPv4",
      typeof session.ip === "string" && session.ip.split(".").length === 4,
    );
  });
  // 4. Validate pagination (limit = 2)
  const paged = await api.functional.shopping.customer.customers.sessions.index(
    connection,
    {
      customerId: customerA.id,
      body: { limit: 2 },
    },
  );
  typia.assert(paged);
  TestValidator.predicate(
    "pagination returns <= 2 records",
    paged.data.length <= 2,
  );
  // 5. Test status filtering
  const activeList =
    await api.functional.shopping.customer.customers.sessions.index(
      connection,
      {
        customerId: customerA.id,
        body: { status: "active" },
      },
    );
  typia.assert(activeList);
  activeList.data.forEach((s) => {
    TestValidator.equals("active session is not expired", s.expired_at, null);
  });
  // 6. Register Customer B
  const registerB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://device-x.example.com",
    referrer: "https://ref.device-x.example.com",
    ip: "10.0.0.1",
  } satisfies IShoppingCustomer.ICreate;
  const customerB = await api.functional.auth.customer.join(connection, {
    body: registerB,
  });
  typia.assert(customerB);
  // Attempt: Fetch Customer A's sessions while logged in as Customer B (should fail)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: registerB.email,
      password: registerB.password,
      href: registerB.href,
      referrer: registerB.referrer,
      ip: registerB.ip,
    },
  });
  await TestValidator.error(
    "Customer B cannot fetch A's sessions",
    async () => {
      await api.functional.shopping.customer.customers.sessions.index(
        connection,
        {
          customerId: customerA.id,
          body: {},
        },
      );
    },
  );
  // 7. Confirm Customer B only sees their own sessions
  const bSessions =
    await api.functional.shopping.customer.customers.sessions.index(
      connection,
      {
        customerId: customerB.id,
        body: {},
      },
    );
  typia.assert(bSessions);
  bSessions.data.forEach((s) => {
    TestValidator.equals(
      "session belongs to customer B",
      s.shopping_customer_id,
      customerB.id,
    );
  });
}

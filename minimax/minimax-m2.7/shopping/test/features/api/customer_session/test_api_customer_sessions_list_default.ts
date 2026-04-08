import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(authorized);
  // 2. Login again to create an additional session
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(loginConnection, {
    body: {
      email: authorized.email,
      password: "Password123!",
      href: "https://example.com/login",
      referrer: "https://example.com/register",
    },
  });
  // 3. Retrieve sessions list with default pagination (empty request body)
  const sessionsResponse =
    await api.functional.ecommerceMall.customer.customer.sessions.index(
      loginConnection,
      {
        body: {},
      },
    );
  typia.assert(sessionsResponse);
  // Validation: Sessions array contains at least one session
  TestValidator.predicate(
    "sessions array not empty",
    sessionsResponse.data.length >= 1,
  );
  // Validation: Sessions ordered by createdAt descending (newest first)
  for (let i = 1; i < sessionsResponse.data.length; i++) {
    const current = new Date(sessionsResponse.data[i].createdAt).getTime();
    const previous = new Date(sessionsResponse.data[i - 1].createdAt).getTime();
    TestValidator.predicate(
      "sessions ordered by createdAt descending",
      current <= previous,
    );
  }
  // Validation: Each session includes required fields
  for (const session of sessionsResponse.data) {
    TestValidator.predicate(
      "session id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.equals("session ip is string", typeof session.ip, "string");
    TestValidator.equals(
      "session href is string",
      typeof session.href,
      "string",
    );
    TestValidator.equals(
      "session referrer is string",
      typeof session.referrer,
      "string",
    );
    TestValidator.predicate(
      "session createdAt is ISO datetime",
      !isNaN(new Date(session.createdAt).getTime()),
    );
    TestValidator.predicate(
      "session expiredAt is ISO datetime",
      !isNaN(new Date(session.expiredAt).getTime()),
    );
    TestValidator.equals(
      "session isActive is boolean",
      typeof session.isActive,
      "boolean",
    );
    // Validation: Customer summary nested object with customer id and email
    TestValidator.predicate(
      "customer id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.customer.id,
      ),
    );
    TestValidator.equals(
      "customer email is string",
      typeof session.customer.email,
      "string",
    );
  }
}

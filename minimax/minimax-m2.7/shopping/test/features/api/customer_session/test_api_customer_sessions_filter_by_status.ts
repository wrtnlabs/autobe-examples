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

export async function test_api_customer_sessions_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Generate a known password for consistent login
  const testPassword = RandomGenerator.alphaNumeric(16);
  // 3. Register a new customer with known password
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      password: testPassword,
    },
  });
  typia.assert(registered);
  // 4. Login with the same credentials to create an active session
  const loggedIn = await authorize_customer_login(customerConnection, {
    body: {
      email: registered.email,
      password: testPassword,
      href: `https://${RandomGenerator.alphabets(8)}.example.com/page`,
      referrer: `https://${RandomGenerator.alphabets(6)}.example.com/`,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(loggedIn);
  // 5. Call PATCH /ecommerceMall/customer/customer/sessions with status='active'
  const activeSessionsResponse =
    await api.functional.ecommerceMall.customer.customer.sessions.index(
      customerConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeSessionsResponse);
  // 6. Verify response contains only active sessions
  TestValidator.predicate(
    "active sessions has at least one record",
    activeSessionsResponse.data.length >= 1,
  );
  TestValidator.equals(
    "all active sessions have isActive = true",
    activeSessionsResponse.data.every((s) => s.isActive === true),
    true,
  );
  // 7. Call PATCH /ecommerceMall/customer/customer/sessions with status='expired'
  const expiredSessionsResponse =
    await api.functional.ecommerceMall.customer.customer.sessions.index(
      customerConnection,
      {
        body: {
          status: "expired",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredSessionsResponse);
  // 8. Verify response returns empty array (no expired sessions for newly created session)
  TestValidator.equals(
    "expired sessions count is 0",
    expiredSessionsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "no expired sessions have isActive = true",
    expiredSessionsResponse.data.some((s) => s.isActive === true),
    false,
  );
}

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

export async function test_api_customer_sessions_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Generate random email and password for registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/",
    },
  });
  typia.assert(authorized);
  // 2. Login to create a session
  const loginTime = new Date();
  const loginResponse = await authorize_customer_login(customerConnection, {
    body: {
      email,
      password,
      href: "https://example.com/login",
      referrer: "https://example.com/register",
    },
  });
  typia.assert(loginResponse);
  // 3. Query sessions with date range that includes the login time
  const sessionsWithRange =
    await api.functional.ecommerceMall.customer.customer.sessions.index(
      customerConnection,
      {
        body: {
          createdFrom: new Date(
            loginTime.getTime() - 60000,
          ).toISOString() as string & tags.Format<"date-time">,
          createdTo: new Date(
            loginTime.getTime() + 60000,
          ).toISOString() as string & tags.Format<"date-time">,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsWithRange);
  // 4. Validate sessions within date range are returned
  TestValidator.equals(
    "sessions found in date range",
    sessionsWithRange.data.length > 0,
    true,
  );
  // 5. Query sessions with future date range (no sessions should match)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const sessionsFuture =
    await api.functional.ecommerceMall.customer.customer.sessions.index(
      customerConnection,
      {
        body: {
          createdFrom: futureDate.toISOString() as string &
            tags.Format<"date-time">,
          createdTo: new Date(
            futureDate.getTime() + 86400000,
          ).toISOString() as string & tags.Format<"date-time">,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsFuture);
  // 6. Validate empty results for future date range
  TestValidator.equals(
    "no sessions in future date range",
    sessionsFuture.data.length,
    0,
  );
}
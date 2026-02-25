import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_search_by_ip(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account using the registration endpoint
  const customerConnection: api.IConnection = { host: connection.host };
  const registrationIp = typia.random<string & tags.Format<"ipv4">>();
  const customer: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: registrationIp,
      } satisfies IEcommerceCustomer.IJoin,
    });
  // 2. Log customer in (this will create a session)
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(loginConnection, {
    body: {
      email: customer.email,
      password: "password123",
    } satisfies IEcommerceCustomer.ILogin,
  });
  // 3. Search sessions by IP address using the registration IP
  const sessionsResponse =
    await api.functional.ecommerce.customer.sessions.index(customerConnection, {
      body: {
        ip: registrationIp,
        page: 1,
        limit: 10,
      } satisfies IEcommerceCustomerSession.IRequest,
    });
  // 4. Validate the response is valid and contains the expected session metadata
  typia.assert(sessionsResponse);
  // Verify IP address matches what we searched for
  TestValidator.equals(
    "IP address matches search query",
    sessionsResponse.data[0].ip,
    registrationIp,
  );
  // Validate all required session fields exist
  TestValidator.predicate(
    "Session metadata includes required fields",
    sessionsResponse.data.length > 0 &&
      sessionsResponse.data[0].ip === registrationIp &&
      sessionsResponse.data[0].href !== "" &&
      sessionsResponse.data[0].referrer !== "" &&
      sessionsResponse.data[0].created_at !== "" &&
      sessionsResponse.data[0].expired_at !== "",
  );
}

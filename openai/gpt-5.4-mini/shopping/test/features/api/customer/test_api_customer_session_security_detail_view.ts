import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_security_detail_view(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const sessionId: string = authorized.token.access;
  const session = await api.functional.shoppingMall.customer.sessions.at(
    customerConnection,
    {
      sessionId: sessionId as string & tags.Format<"uuid">,
    },
  );
  typia.assert(session);
  TestValidator.equals(
    "session owner id matches authenticated customer",
    session.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "session owner email matches authenticated customer",
    session.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "session created timestamp matches authorization timestamp",
    session.createdAt,
    authorized.createdAt,
  );
  TestValidator.predicate(
    "session expiration timestamp is present",
    session.expiredAt.length > 0,
  );
  TestValidator.predicate("session IP is present", session.ip.length > 0);
  TestValidator.predicate("session href is present", session.href.length > 0);
  TestValidator.predicate(
    "session referrer is present",
    session.referrer.length > 0,
  );
  const sessionAgain = await api.functional.shoppingMall.customer.sessions.at(
    customerConnection,
    {
      sessionId: session.id,
    },
  );
  typia.assert(sessionAgain);
  TestValidator.equals(
    "session detail view is stable across repeated reads",
    sessionAgain,
    session,
  );
}

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

export async function test_api_customer_session_inspection(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const session = await api.functional.shoppingMall.customer.sessions.at(
    customerConnection,
    {
      sessionId: authorized.token.access as unknown as string &
        tags.Format<"uuid">,
    },
  );
  typia.assert(session);
  TestValidator.equals("session owner id", session.customer.id, authorized.id);
  TestValidator.equals(
    "session owner email",
    session.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "session owner account status",
    session.customer.accountStatus,
    authorized.accountStatus,
  );
  TestValidator.equals(
    "session owner bannedAt",
    session.customer.bannedAt,
    authorized.bannedAt,
  );
  TestValidator.equals(
    "session owner deletedAt",
    session.customer.deletedAt,
    authorized.deletedAt,
  );
  TestValidator.equals(
    "session owner createdAt",
    session.customer.createdAt,
    authorized.createdAt,
  );
  TestValidator.equals(
    "session owner updatedAt",
    session.customer.updatedAt,
    authorized.updatedAt,
  );
  TestValidator.predicate("session ip recorded", session.ip.length > 0);
  TestValidator.predicate("session href recorded", session.href.length > 0);
  TestValidator.predicate(
    "session referrer recorded",
    session.referrer.length > 0,
  );
  TestValidator.equals(
    "session createdAt matches auth createdAt",
    session.createdAt,
    authorized.createdAt,
  );
  TestValidator.predicate(
    "session expires after creation",
    new Date(session.expiredAt).getTime() >=
      new Date(session.createdAt).getTime(),
  );
}

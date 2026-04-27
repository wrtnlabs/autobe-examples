import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_administrator_customer_retrieval_banned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  const customerId: string = customerAuth.id;
  // 3. Ban the customer as administrator
  const banned = await api.functional.eCommerceMall.administrator.customers.ban(
    adminConnection,
    {
      customerId,
    },
  );
  typia.assert(banned);
  TestValidator.equals("banned customer id", banned.id, customerId);
  // 4. Retrieve the banned customer as administrator
  const retrieved =
    await api.functional.eCommerceMall.administrator.customers.at(
      adminConnection,
      {
        customerId,
      },
    );
  typia.assert(retrieved);
  // 5. Validate the retrieved customer details
  TestValidator.equals(
    "customer id matches requested id",
    retrieved.id,
    customerId,
  );
  TestValidator.predicate(
    "email is present and non-empty",
    () => typeof retrieved.email === "string" && retrieved.email.length > 0,
  );
  TestValidator.predicate(
    "profile is present",
    () => retrieved.profile !== null && retrieved.profile !== undefined,
  );
  TestValidator.predicate(
    "banned_at is a non-null datetime string",
    () =>
      retrieved.banned_at !== null && typeof retrieved.banned_at === "string",
  );
  TestValidator.equals(
    "deleted_at is null (customer was not deleted)",
    retrieved.deleted_at,
    null,
  );
}

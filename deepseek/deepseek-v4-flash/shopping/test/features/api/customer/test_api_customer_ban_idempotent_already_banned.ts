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

export async function test_api_customer_ban_idempotent_already_banned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized: IECommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallAdministrator.IJoin,
    });
  typia.assert(adminAuthorized);
  // 2. Create a customer account
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuthorized: IECommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerJoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customerAuthorized);
  // 3. Ban the customer the first time
  const firstBan: IECommerceMallCustomer =
    await api.functional.eCommerceMall.administrator.customers.ban(
      adminConnection,
      {
        customerId: customerAuthorized.id,
      },
    );
  typia.assert(firstBan);
  TestValidator.predicate(
    "first ban: banned_at is non-null",
    firstBan.banned_at !== null,
  );
  // 4. Ban the same customer a second time (idempotent)
  const secondBan: IECommerceMallCustomer =
    await api.functional.eCommerceMall.administrator.customers.ban(
      adminConnection,
      {
        customerId: customerAuthorized.id,
      },
    );
  typia.assert(secondBan);
  TestValidator.predicate(
    "second ban: banned_at is still non-null (idempotent)",
    secondBan.banned_at !== null,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_customer_unban_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Promote the administrator to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: adminJoin.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IECommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminJoin);
  // 3. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IECommerceMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 4. As super administrator, ban the customer
  const bannedCustomer =
    await api.functional.eCommerceMall.superAdministrator.customers.ban(
      superAdminConnection,
      { customerId: customerJoin.id },
    );
  typia.assert(bannedCustomer);
  TestValidator.predicate(
    "banned customer has banned_at set",
    bannedCustomer.banned_at !== null,
  );
  // 5. Target operation: Unban the customer as super administrator
  const unbannedCustomer =
    await api.functional.eCommerceMall.superAdministrator.customers.unban(
      superAdminConnection,
      { customerId: customerJoin.id },
    );
  typia.assert(unbannedCustomer);
  // 6. Validate the unban response
  TestValidator.predicate(
    "banned_at is null after unban",
    unbannedCustomer.banned_at === null,
  );
  TestValidator.predicate(
    "updated_at is newer than banned_at",
    new Date(unbannedCustomer.updated_at).getTime() >
      new Date(bannedCustomer.banned_at!).getTime(),
  );
  // 7. Verify the unbanned customer can log in again
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallCustomer.ILogin,
  });
  typia.assert(loginResult);
}

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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_customer_ban_already_banned_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  // 2. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. First ban call — sets banned_at
  const firstBan =
    await api.functional.eCommerceMall.superAdministrator.customers.ban(
      superAdminConnection,
      { customerId: customerAuth.id },
    );
  typia.assert(firstBan);
  TestValidator.predicate(
    "banned_at is set after first ban",
    () => firstBan.banned_at !== null,
  );
  // 4. Second ban call — idempotent, should still succeed
  const secondBan =
    await api.functional.eCommerceMall.superAdministrator.customers.ban(
      superAdminConnection,
      { customerId: customerAuth.id },
    );
  typia.assert(secondBan);
  TestValidator.predicate(
    "banned_at is still set after second ban",
    () => secondBan.banned_at !== null,
  );
}

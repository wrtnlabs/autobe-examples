import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomer";
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

export async function test_api_customers_filter_by_ban_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {});
  // 2. Create two customer accounts with distinct emails
  const customer1Conn: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Conn, {});
  const customer1Id = customer1.id;
  const customer2Conn: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Conn, {});
  const customer2Id = customer2.id;
  // 3. Ban the first customer
  const bannedCustomer =
    await api.functional.eCommerceMall.superAdministrator.customers.ban(
      superAdminConnection,
      { customerId: customer1Id },
    );
  typia.assert(bannedCustomer);
  TestValidator.equals(
    "banned customer id matches",
    bannedCustomer.id,
    customer1Id,
  );
  TestValidator.predicate(
    "banned_at is set for banned customer",
    bannedCustomer.banned_at !== null,
  );
  // 4. Call with banned=true filter — retrieve only banned customers
  const bannedResult =
    await api.functional.eCommerceMall.superAdministrator.customers.index(
      superAdminConnection,
      { body: { banned: true } satisfies IECommerceMallCustomer.IRequest },
    );
  typia.assert(bannedResult);
  // 5. Verify only the banned customer is returned
  TestValidator.equals(
    "banned filter returns exactly one record",
    bannedResult.data.length,
    1,
  );
  TestValidator.equals(
    "banned customer id matches",
    bannedResult.data[0].id,
    customer1Id,
  );
  TestValidator.predicate(
    "banned customer has non-null banned_at",
    bannedResult.data[0].banned_at !== null,
  );
  TestValidator.equals(
    "banned filter records count",
    bannedResult.pagination.records,
    1,
  );
  // 6. Call with banned=false filter — retrieve only unbanned customers
  const unbannedResult =
    await api.functional.eCommerceMall.superAdministrator.customers.index(
      superAdminConnection,
      { body: { banned: false } satisfies IECommerceMallCustomer.IRequest },
    );
  typia.assert(unbannedResult);
  // 7. Verify only unbanned customers are returned (the second customer)
  const hasUnbannedCustomer2 = unbannedResult.data.some(
    (c: IECommerceMallCustomer.ISummary) => c.id === customer2Id,
  );
  TestValidator.predicate(
    "unbanned filter includes unbanned customer",
    hasUnbannedCustomer2,
  );
  const hasBannedCustomer1 = unbannedResult.data.some(
    (c: IECommerceMallCustomer.ISummary) => c.id === customer1Id,
  );
  TestValidator.predicate(
    "unbanned filter excludes banned customer",
    !hasBannedCustomer1,
  );
  const unbannedCustomer2 = unbannedResult.data.find(
    (c: IECommerceMallCustomer.ISummary) => c.id === customer2Id,
  );
  typia.assertGuard(unbannedCustomer2!);
  TestValidator.equals(
    "unbanned customer banned_at is null",
    unbannedCustomer2.banned_at,
    null,
  );
  // 8. Verify pagination metadata
  TestValidator.predicate(
    "banned pagination current >= 1",
    bannedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "banned pagination limit >= 1",
    bannedResult.pagination.limit >= 1,
  );
  TestValidator.equals(
    "banned pagination records",
    bannedResult.pagination.records,
    1,
  );
  TestValidator.predicate(
    "banned pagination pages >= 1",
    bannedResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "unbanned pagination current >= 1",
    unbannedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "unbanned pagination limit >= 1",
    unbannedResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "unbanned pagination records >= 1",
    unbannedResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "unbanned pagination pages >= 1",
    unbannedResult.pagination.pages >= 1,
  );
}

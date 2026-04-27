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

export async function test_api_customer_retrieval_banned_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Promote the administrator to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
      },
    },
  );
  typia.assert(superAdmin);
  // 3. Register a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 4. Ban the customer using super administrator
  const bannedCustomer =
    await api.functional.eCommerceMall.superAdministrator.customers.ban(
      superAdminConnection,
      { customerId: customer.id },
    );
  typia.assert(bannedCustomer);
  TestValidator.predicate(
    "banned customer has banned_at set",
    () => bannedCustomer.banned_at !== null,
  );
  // 5. Retrieve the banned customer's details using super administrator
  const retrievedCustomer =
    await api.functional.eCommerceMall.superAdministrator.customers.at(
      superAdminConnection,
      { customerId: customer.id },
    );
  typia.assert(retrievedCustomer);
  // 6. Validate the response fields
  TestValidator.equals(
    "customer id matches",
    retrievedCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "profile id matches",
    retrievedCustomer.profile.id,
    customer.profile.id,
  );
  TestValidator.predicate(
    "retrieved banned customer has banned_at set",
    () => retrievedCustomer.banned_at !== null,
  );
  TestValidator.equals(
    "banned_at is consistent between ban and retrieval",
    retrievedCustomer.banned_at,
    bannedCustomer.banned_at,
  );
  TestValidator.predicate(
    "banned customer deleted_at is null",
    () => retrievedCustomer.deleted_at === null,
  );
}

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_view_by_admin_without_addresses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate as admin
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: "Need admin access for testing customer management features",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create a customer without any addresses
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinResult = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerJoinResult);
  // 3. Admin views the customer details (no addresses have been added)
  const customer = await api.functional.ecommerceMall.admin.customers.at(
    adminLoginConnection,
    {
      customerId: customerJoinResult.id,
    },
  );
  typia.assert(customer);
  // 4. Validate customer data
  TestValidator.equals(
    "customer id matches",
    customer.id,
    customerJoinResult.id,
  );
  TestValidator.equals(
    "email matches",
    customer.email,
    customerJoinResult.email,
  );
  TestValidator.equals("has profile", customer.profile !== null, true);
  TestValidator.equals("profile has id", customer.profile.id !== null, true);
  // 5. Validate addresses array is empty (not null)
  TestValidator.equals(
    "addresses is empty array",
    customer.addresses.length,
    0,
  );
}

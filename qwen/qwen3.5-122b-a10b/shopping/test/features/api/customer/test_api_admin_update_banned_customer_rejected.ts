import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_admin_update_banned_customer_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: (adminConnection.headers?.Authorization as string)?.replace(
        "Bearer ",
        "",
      ) ?? "",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create customer account
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerId: string & tags.Format<"uuid"> = customerAuth.id;
  // 3. Ban the customer account
  const banConnection: api.IConnection = { host: connection.host };
  banConnection.headers = {
    Authorization: adminLoginConnection.headers?.Authorization ?? "",
  };
  const bannedCustomer = await api.functional.ecommerceMall.admin.customers.ban(
    banConnection,
    { customerId },
  );
  typia.assert(bannedCustomer);
  TestValidator.equals(
    "customer banned",
    bannedCustomer.account_status,
    "banned",
  );
  // 4. Attempt to update banned customer (should fail)
  const updateConnection: api.IConnection = { host: connection.host };
  updateConnection.headers = {
    Authorization: adminLoginConnection.headers?.Authorization ?? "",
  };
  await TestValidator.error("banned customer update rejected", async () => {
    await api.functional.ecommerceMall.admin.customers.update(
      updateConnection,
      {
        customerId,
        body: {
          display_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
        } satisfies IEcommerceMallCustomer.IUpdate,
      },
    );
  });
  // 5. Verify customer profile remains unchanged (still banned)
  const getCustomer = await api.functional.ecommerceMall.admin.customers.update(
    updateConnection,
    {
      customerId,
      body: {},
    },
  );
  typia.assert(getCustomer);
  TestValidator.equals(
    "customer still banned",
    getCustomer.account_status,
    "banned",
  );
}
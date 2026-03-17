import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_customer_profile_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // 2. Register a new customer account and record registration details
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerNickname = RandomGenerator.name(1);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      nickname: customerNickname,
    },
  });
  // 3. As the authenticated super administrator, retrieve the customer profile
  const customerId = customerAuth.id;
  const customer = await api.functional.shoppingMall.superAdmin.customers.at(
    superAdminConnection,
    {
      customerId,
    },
  );
  typia.assert(customer);
  // 4. Validate returned fields match registration data
  TestValidator.equals("customer id matches", customer.id, customerId);
  TestValidator.equals("customer email matches", customer.email, customerEmail);
  TestValidator.equals(
    "customer nickname matches",
    customer.nickname,
    customerNickname,
  );
  // 5. Validate account is active and not banned/deleted
  TestValidator.equals("isBanned is false", customer.isBanned, false);
  TestValidator.equals("deletedAt is null", customer.deletedAt, null);
}

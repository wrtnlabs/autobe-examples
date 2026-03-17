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

export async function test_api_customer_ban_by_super_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  // 2. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Capture customer's original data for validation
  const customerId = customerAuth.customer.id;
  const customerEmail = customerAuth.customer.email;
  const customerNickname = customerAuth.customer.nickname;
  // 3. Ban the customer using super admin connection
  const bannedCustomer =
    await api.functional.shoppingMall.superAdmin.customers.ban(
      superAdminConnection,
      {
        customerId,
      },
    );
  typia.assert(bannedCustomer);
  // 4. Validate isBanned is true
  TestValidator.equals("customer is banned", bannedCustomer.isBanned, true);
  // 5. Validate id, email, nickname remain unchanged
  TestValidator.equals("customer id matches", bannedCustomer.id, customerId);
  TestValidator.equals(
    "customer email matches",
    bannedCustomer.email,
    customerEmail,
  );
  TestValidator.equals(
    "customer nickname matches",
    bannedCustomer.nickname,
    customerNickname,
  );
  // 6. Validate deletedAt is null (not soft-deleted, only banned)
  TestValidator.equals(
    "customer deletedAt is null",
    bannedCustomer.deletedAt,
    null,
  );
}

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

export async function test_api_customer_profile_retrieval_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register customer - capture email and id
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
    },
  });
  typia.assert(customerAuthorized);
  const customerId = customerAuthorized.id;
  // 3. Ban the customer as super admin
  const bannedCustomer =
    await api.functional.shoppingMall.superAdmin.customers.ban(
      superAdminConnection,
      {
        customerId,
      },
    );
  typia.assert(bannedCustomer);
  // 4. Retrieve the banned customer's profile as super admin
  const profile = await api.functional.shoppingMall.superAdmin.customers.at(
    superAdminConnection,
    {
      customerId,
    },
  );
  typia.assert(profile);
  // 5. Assert isBanned is true
  TestValidator.equals("isBanned should be true", profile.isBanned, true);
  // 6. Assert deletedAt is null (banned ≠ deleted)
  TestValidator.equals("deletedAt should be null", profile.deletedAt, null);
  // 7. Assert id matches
  TestValidator.equals("id matches", profile.id, customerId);
  // 8. Assert email matches
  TestValidator.equals("email matches", profile.email, customerEmail);
}

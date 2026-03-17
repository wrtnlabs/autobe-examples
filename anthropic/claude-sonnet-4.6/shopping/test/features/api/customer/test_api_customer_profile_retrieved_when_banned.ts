import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_customer_profile_retrieved_when_banned(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new admin account and get an authorized admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Register a new customer account and get the customer's UUID
  const customerConnection: api.IConnection = { host: connection.host };
  const customerSession = await authorize_customer_join(customerConnection, {});
  const customerId = customerSession.id;
  // Step 3: Ban the customer using the admin connection
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    { customerId },
  );
  typia.assert(bannedCustomer);
  // Step 4: Retrieve the banned customer's profile via the admin endpoint
  const profile = await api.functional.shoppingMall.admin.customers.at(
    adminConnection,
    { customerId },
  );
  typia.assert(profile);
  // Step 5: Validate the profile reflects the banned status
  TestValidator.equals("customer id matches", profile.id, customerId);
  TestValidator.equals("isBanned is true", profile.isBanned, true);
  TestValidator.equals("deletedAt is null", profile.deletedAt, null);
}

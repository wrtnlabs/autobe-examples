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

export async function test_api_customer_profile_retrieved_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin session
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a new customer, capturing their registration details
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerNickname = RandomGenerator.name(1);
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      nickname: customerNickname,
      phone: null,
    },
  });
  typia.assert(customerAuthorized);
  const customerId = customerAuthorized.id;
  // 3. Admin retrieves the customer profile
  const customerProfile = await api.functional.shoppingMall.admin.customers.at(
    adminConnection,
    { customerId },
  );
  typia.assert(customerProfile);
  // 4. Validate the returned profile fields
  TestValidator.equals("customer id matches", customerProfile.id, customerId);
  TestValidator.equals(
    "customer email matches",
    customerProfile.email,
    customerEmail,
  );
  TestValidator.equals(
    "customer nickname matches",
    customerProfile.nickname,
    customerNickname,
  );
  TestValidator.equals("customer phone is null", customerProfile.phone, null);
  TestValidator.equals(
    "customer is not banned",
    customerProfile.isBanned,
    false,
  );
  TestValidator.equals(
    "customer deletedAt is null",
    customerProfile.deletedAt,
    null,
  );
}

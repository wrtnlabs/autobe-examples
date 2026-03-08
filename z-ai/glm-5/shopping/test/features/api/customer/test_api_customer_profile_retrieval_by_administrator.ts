import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function test_api_customer_profile_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator for oversight access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a customer account whose profile will be retrieved
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  // 3. Administrator retrieves the customer's profile
  const customerProfile =
    await api.functional.shoppingMall.administrator.customers.at(
      adminConnection,
      { customerId: customerAuth.id },
    );
  typia.assert(customerProfile);
  // 4. Validate response matches the created customer
  TestValidator.equals(
    "customer id matches",
    customerProfile.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    customerProfile.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "display name matches",
    customerProfile.displayName,
    customerAuth.displayName,
  );
  TestValidator.equals(
    "phone number matches",
    customerProfile.phoneNumber,
    customerAuth.phoneNumber,
  );
  TestValidator.equals(
    "banned status is false for new customer",
    customerProfile.banned,
    false,
  );
}

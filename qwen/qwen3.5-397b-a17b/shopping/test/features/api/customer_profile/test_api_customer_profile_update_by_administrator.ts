import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

export async function test_api_customer_profile_update_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdministrator.IJoin;
  await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  const adminLoginResult = await authorize_administrator_login(
    adminConnection,
    {
      body: {
        email: adminCredentials.email,
        password: adminCredentials.password,
      } satisfies IShoppingMallAdministrator.ILogin,
    },
  );
  typia.assert(adminLoginResult);
  // 2. Customer setup - create customer account with profile
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerJoinResult = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(customerJoinResult);
  const originalProfile = customerJoinResult.profile;
  const originalDisplayName = originalProfile.display_name;
  const originalPhoneNumber = originalProfile.phone_number;
  // 3. Administrator updates customer profile
  const updatedDisplayName = RandomGenerator.name();
  const updatedPhoneNumber = RandomGenerator.mobile();
  const updateBody = {
    display_name: updatedDisplayName,
    phone_number: updatedPhoneNumber,
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  const updatedProfile =
    await api.functional.shoppingMall.administrator.customers.profiles.update(
      adminConnection,
      { body: updateBody },
    );
  typia.assert(updatedProfile);
  // 4. Validate updated profile values
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "phone_number updated",
    updatedProfile.phone_number,
    updatedPhoneNumber,
  );
  // 5. Validate timestamps
  TestValidator.predicate("updated_at is after created_at", () => {
    return (
      new Date(updatedProfile.updated_at).getTime() >=
      new Date(updatedProfile.created_at).getTime()
    );
  });
  // 6. Validate customer relation
  TestValidator.equals(
    "customer id matches",
    updatedProfile.customer.id,
    customerJoinResult.id,
  );
  TestValidator.equals(
    "customer email matches",
    updatedProfile.customer.email,
    customerCredentials.email,
  );
  // 7. Validate profile was actually changed
  TestValidator.notEquals(
    "display_name changed",
    originalDisplayName,
    updatedProfile.display_name,
  );
  TestValidator.notEquals(
    "phone_number changed",
    originalPhoneNumber,
    updatedProfile.phone_number,
  );
}

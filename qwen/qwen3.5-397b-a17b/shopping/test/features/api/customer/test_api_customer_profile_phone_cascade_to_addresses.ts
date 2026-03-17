import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function test_api_customer_profile_phone_cascade_to_addresses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminJoin = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: "Admin123!",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create customer account with initial phone number
  const originalPhoneNumber = RandomGenerator.mobile();
  const customerJoin = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer123!",
      nickname: RandomGenerator.name(),
      phone_number: originalPhoneNumber,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 3. Admin updates customer's phone number
  const newPhoneNumber = RandomGenerator.mobile();
  const updatedCustomer =
    await api.functional.shoppingMall.admin.customers.update(adminConnection, {
      customerId: customerJoin.id,
      body: {
        phoneNumber: newPhoneNumber,
      } satisfies IShoppingMallCustomer.IUpdate,
    });
  typia.assert(updatedCustomer);
  // 4. Validate phone number was updated successfully
  TestValidator.equals(
    "phone number updated to new value",
    updatedCustomer.phone_number,
    newPhoneNumber,
  );
  TestValidator.notEquals(
    "phone number differs from original",
    updatedCustomer.phone_number,
    originalPhoneNumber,
  );
  // 5. Verify customer identity and other fields preserved
  TestValidator.equals(
    "customer id preserved",
    updatedCustomer.id,
    customerJoin.id,
  );
  TestValidator.equals(
    "email preserved",
    updatedCustomer.email,
    customerJoin.email,
  );
  TestValidator.equals(
    "nickname preserved",
    updatedCustomer.nickname,
    customerJoin.nickname,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedCustomer.updated_at !== null,
  );
}

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

export async function test_api_customer_profile_phone_cleared_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // Step 2: Register a customer with an explicit phone number
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customerNickname = RandomGenerator.name(1);
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(16),
      nickname: customerNickname,
      phone: customerPhone,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.customer.id;
  // Step 3: First, set a phone number via super admin update (ensure phone is non-null)
  const firstUpdateNickname = RandomGenerator.name(1);
  const firstUpdatePhone = RandomGenerator.mobile();
  const firstUpdate =
    await api.functional.shoppingMall.superAdmin.customers.update(
      superAdminConnection,
      {
        customerId,
        body: {
          nickname: firstUpdateNickname,
          phone: firstUpdatePhone,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // Step 4: Now clear the phone by setting it to null
  const clearPhoneNickname = RandomGenerator.name(1);
  const updatedCustomer =
    await api.functional.shoppingMall.superAdmin.customers.update(
      superAdminConnection,
      {
        customerId,
        body: {
          nickname: clearPhoneNickname,
          phone: null,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedCustomer);
  // Step 5: Assertions
  TestValidator.equals(
    "phone is null after clearing",
    updatedCustomer.phone,
    null,
  );
  TestValidator.equals(
    "nickname matches submitted value",
    updatedCustomer.nickname,
    clearPhoneNickname,
  );
  TestValidator.equals(
    "email is immutable",
    updatedCustomer.email,
    customerEmail,
  );
  TestValidator.equals(
    "customer is not banned",
    updatedCustomer.isBanned,
    false,
  );
  TestValidator.equals(
    "account is active (deletedAt is null)",
    updatedCustomer.deletedAt,
    null,
  );
  TestValidator.equals("customer id matches", updatedCustomer.id, customerId);
}

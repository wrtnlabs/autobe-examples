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

export async function test_api_customer_profile_update_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // Step 2: Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerNickname = RandomGenerator.name(1);
  const customerSession = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      nickname: customerNickname,
      phone: null,
    },
  });
  typia.assert(customerSession);
  const customerId = customerSession.customer.id;
  const originalEmail = customerSession.customer.email;
  const originalCreatedAt = customerSession.customer.createdAt;
  // Step 3: Super admin updates the customer's profile
  const newNickname = RandomGenerator.name(2);
  const newPhone = RandomGenerator.mobile("+821");
  const updatedCustomer =
    await api.functional.shoppingMall.superAdmin.customers.update(
      superAdminConnection,
      {
        customerId,
        body: {
          nickname: newNickname,
          phone: newPhone,
        } satisfies IShoppingMallCustomer.IUpdate,
      },
    );
  typia.assert(updatedCustomer);
  // Step 4: Validate the response fields
  TestValidator.equals(
    "nickname updated",
    updatedCustomer.nickname,
    newNickname,
  );
  TestValidator.equals("phone updated", updatedCustomer.phone, newPhone);
  TestValidator.equals("email unchanged", updatedCustomer.email, originalEmail);
  TestValidator.equals("account not banned", updatedCustomer.isBanned, false);
  TestValidator.equals(
    "account still active (deletedAt is null)",
    updatedCustomer.deletedAt,
    null,
  );
  TestValidator.predicate(
    "updatedAt is not before createdAt",
    new Date(updatedCustomer.updatedAt) >= new Date(originalCreatedAt),
  );
}

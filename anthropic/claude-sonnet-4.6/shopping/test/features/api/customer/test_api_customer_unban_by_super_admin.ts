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

export async function test_api_customer_unban_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Super Admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Setup Customer - register and capture credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.MinLength<8> &
    tags.Format<"password">;
  const customerNickname = RandomGenerator.name(1);
  const customerConnection: api.IConnection = { host: connection.host };
  const joinedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      nickname: customerNickname,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinedCustomer);
  const customerId = joinedCustomer.id;
  const originalCreatedAt = joinedCustomer.createdAt;
  const originalDeletedAt = joinedCustomer.deletedAt;
  // 3. Ban the customer first (prerequisite for unban)
  const bannedCustomer =
    await api.functional.shoppingMall.superAdmin.customers.ban(
      superAdminConnection,
      { customerId },
    );
  typia.assert(bannedCustomer);
  TestValidator.equals(
    "customer is banned after ban",
    bannedCustomer.isBanned,
    true,
  );
  // Record timestamp just before unbanning to compare with updatedAt
  const beforeUnbanTime = new Date().toISOString();
  // 4. Execute the unban operation (main endpoint under test)
  const unbannedCustomer =
    await api.functional.shoppingMall.superAdmin.customers.unban(
      superAdminConnection,
      { customerId },
    );
  typia.assert(unbannedCustomer);
  // 5. Validate unban response
  // isBanned must be false after unban
  TestValidator.equals(
    "customer is no longer banned",
    unbannedCustomer.isBanned,
    false,
  );
  // updatedAt must be more recent than before the unban call
  TestValidator.predicate(
    "updatedAt is more recent after unban",
    () => new Date(unbannedCustomer.updatedAt) >= new Date(beforeUnbanTime),
  );
  // Immutable fields must remain unchanged
  TestValidator.equals(
    "customer id unchanged",
    unbannedCustomer.id,
    customerId,
  );
  TestValidator.equals(
    "customer email unchanged",
    unbannedCustomer.email,
    customerEmail,
  );
  TestValidator.equals(
    "customer nickname unchanged",
    unbannedCustomer.nickname,
    customerNickname,
  );
  TestValidator.equals(
    "customer createdAt unchanged",
    unbannedCustomer.createdAt,
    originalCreatedAt,
  );
  TestValidator.equals(
    "customer deletedAt unchanged",
    unbannedCustomer.deletedAt,
    originalDeletedAt,
  );
  // 6. Verify the customer can log in again after unbanning
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  typia.assert(loginResult);
}

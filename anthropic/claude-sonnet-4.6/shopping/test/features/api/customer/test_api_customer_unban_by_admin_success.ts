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

export async function test_api_customer_unban_by_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up admin connection (let utility auto-generate credentials)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Set up customer connection and record credentials for later login test
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const customerNickname = RandomGenerator.name(1);
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      nickname: customerNickname,
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  const customerId = joinResult.id;
  const originalEmail = joinResult.email;
  const originalNickname = joinResult.nickname;
  const originalPhone = joinResult.phone;
  // 3. Ban the customer via admin
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    { customerId },
  );
  typia.assert(bannedCustomer);
  TestValidator.equals(
    "customer is banned after ban operation",
    bannedCustomer.isBanned,
    true,
  );
  const updatedAtAfterBan = bannedCustomer.updatedAt;
  // 4. Unban the customer (target operation)
  const unbannedCustomer =
    await api.functional.shoppingMall.admin.customers.unban(adminConnection, {
      customerId,
    });
  typia.assert(unbannedCustomer);
  // 5. Validate unban result
  TestValidator.equals(
    "isBanned is false after unban",
    unbannedCustomer.isBanned,
    false,
  );
  TestValidator.equals(
    "id matches original customer",
    unbannedCustomer.id,
    customerId,
  );
  TestValidator.equals(
    "email matches original customer",
    unbannedCustomer.email,
    originalEmail,
  );
  TestValidator.equals(
    "nickname matches original customer",
    unbannedCustomer.nickname,
    originalNickname,
  );
  TestValidator.equals(
    "phone matches original customer",
    unbannedCustomer.phone,
    originalPhone,
  );
  TestValidator.equals(
    "deletedAt is null (account not deleted)",
    unbannedCustomer.deletedAt,
    null,
  );
  TestValidator.predicate(
    "updatedAt is more recent than or equal to updatedAt after ban",
    unbannedCustomer.updatedAt >= updatedAtAfterBan,
  );
  // 6. Post-condition: customer can log in again after unban
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "logged-in customer email matches",
    loginResult.email,
    customerEmail,
  );
}

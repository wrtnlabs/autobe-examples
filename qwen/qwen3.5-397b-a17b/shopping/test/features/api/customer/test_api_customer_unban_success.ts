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

/**
 * Test administrator unbanning a previously banned customer account.
 *
 * This test validates the complete ban/unban workflow:
 * 1. Administrator creates account and authenticates
 * 2. Customer creates account and authenticates
 * 3. Administrator bans the customer account
 * 4. Administrator unbans the customer account
 * 5. Verify unban returns customer information successfully
 */
export async function test_api_customer_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Administrator bans the customer
  await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
    customerId: customerAuth.id,
  });
  // 4. Administrator unbans the customer
  const unbannedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.admin.customers.unban(
      adminConnection,
      {
        customerId: customerAuth.id,
      },
    );
  typia.assert(unbannedCustomer);
  // 5. Verify unban returned correct customer information
  TestValidator.equals(
    "customer id matches",
    unbannedCustomer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    unbannedCustomer.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "customer nickname matches",
    unbannedCustomer.nickname,
    customerAuth.nickname,
  );
  TestValidator.equals(
    "customer phone matches",
    unbannedCustomer.phone_number,
    customerAuth.phone_number,
  );
}

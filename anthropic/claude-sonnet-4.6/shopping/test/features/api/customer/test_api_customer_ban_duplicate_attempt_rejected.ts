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

export async function test_api_customer_ban_duplicate_attempt_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup customer connection and register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  const customerId = customerAuth.id;
  // 3. First ban call - should succeed
  const firstBanResult = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    { customerId },
  );
  typia.assert(firstBanResult);
  TestValidator.equals(
    "first ban sets isBanned true",
    firstBanResult.isBanned,
    true,
  );
  // Record updatedAt after the first ban
  const updatedAtAfterFirstBan = firstBanResult.updatedAt;
  // 4. Second ban call - should be rejected (duplicate ban attempt)
  await TestValidator.error(
    "duplicate ban attempt must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
        customerId,
      });
    },
  );
  // 5. Verify customer record is unchanged after the duplicate ban attempt
  const customerAfterDuplicateBan =
    await api.functional.shoppingMall.admin.customers.at(adminConnection, {
      customerId,
    });
  typia.assert(customerAfterDuplicateBan);
  TestValidator.equals(
    "customer remains banned after duplicate ban attempt",
    customerAfterDuplicateBan.isBanned,
    true,
  );
  TestValidator.equals(
    "updatedAt unchanged after rejected duplicate ban",
    customerAfterDuplicateBan.updatedAt,
    updatedAtAfterFirstBan,
  );
}

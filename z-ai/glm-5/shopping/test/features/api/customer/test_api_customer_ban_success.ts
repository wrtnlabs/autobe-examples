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

export async function test_api_customer_ban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create customer account (will have active session)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  const originalEmail = customerAuth.email;
  const originalDisplayName = customerAuth.displayName;
  const originalPhoneNumber = customerAuth.phoneNumber;
  // 3. Admin bans the customer
  const banReason = "Violation of terms of service - repeated spam activity";
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    {
      customerId,
      body: { reason: banReason } satisfies IShoppingMallCustomer.IBan,
    },
  );
  typia.assert(bannedCustomer);
  // 4. Verify customer ID matches
  TestValidator.equals("customer ID matches", bannedCustomer.id, customerId);
  // 5. Verify profile data is preserved (not cleared)
  TestValidator.equals("email preserved", bannedCustomer.email, originalEmail);
  TestValidator.equals(
    "displayName preserved",
    bannedCustomer.displayName,
    originalDisplayName,
  );
  TestValidator.equals(
    "phoneNumber preserved",
    bannedCustomer.phoneNumber,
    originalPhoneNumber,
  );
  // 6. Verify account is not soft-deleted (deletedAt should be null)
  TestValidator.equals("deletedAt is null", bannedCustomer.deletedAt, null);
  // 7. Verify updated timestamp changed
  TestValidator.predicate(
    "updatedAt is recent",
    new Date(bannedCustomer.updatedAt).getTime() >
      new Date(customerAuth.createdAt).getTime(),
  );
}

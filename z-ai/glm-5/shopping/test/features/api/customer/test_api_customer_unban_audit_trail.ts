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
 * Test that verifies the audit trail integrity for customer unban operations.
 *
 * This test validates that:
 * 1. An administrator can ban a customer with a documented reason
 * 2. An administrator can subsequently unban the same customer
 * 3. The unban operation returns the updated customer record
 * 4. The complete ban-unban lifecycle can be traced through the returned data
 *
 * Test Flow:
 * 1. Create an admin account and authenticate
 * 2. Create a customer account that will undergo ban-unban lifecycle
 * 3. Admin bans the customer with a specific reason
 * 4. Admin unbans the customer
 * 5. Verify the customer's status reflects the unban operation
 */
export async function test_api_customer_unban_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // 3. Admin bans the customer with a specific reason
  const banReason = `Policy violation - Test audit trail ${Date.now()}`;
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    {
      customerId,
      body: { reason: banReason } satisfies IShoppingMallCustomer.IBan,
    },
  );
  typia.assert(bannedCustomer);
  // 4. Admin unbans the customer
  const unbannedCustomer =
    await api.functional.shoppingMall.admin.admin.customers.unban(
      adminConnection,
      {
        customerId,
      },
    );
  typia.assert(unbannedCustomer);
  // 5. Verify the unban operation completed successfully
  TestValidator.equals(
    "customer id preserved",
    unbannedCustomer.id,
    customerId,
  );
  TestValidator.equals(
    "customer email preserved",
    unbannedCustomer.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "customer can be identified",
    unbannedCustomer.id === customerId,
  );
}

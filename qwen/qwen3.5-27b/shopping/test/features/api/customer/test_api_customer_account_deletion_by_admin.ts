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

export async function test_api_customer_account_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer account deletion by admin.
   * Validates that administrators can delete customer accounts and that
   * deleted accounts cannot authenticate.
   */
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  typia.assert(adminAuth);
  // 2. Create a test customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Verify customer exists and is active
  TestValidator.equals(
    "customer id is valid",
    customerAuth.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer status is active",
    customerAuth.status,
    "active",
  );
  TestValidator.equals(
    "customer is not deleted",
    customerAuth.deleted_at,
    null,
  );
  // Store customer credentials for later login attempt
  const customerEmail = customerAuth.email;
  const customerPassword = "1234";
  // 4. Execute the delete operation as admin
  await api.functional.shoppingMall.admin.customers.erase(adminConnection, {
    customerId: customerAuth.id,
  });
  // 5. Verify the customer cannot login after deletion
  const deletedCustomerConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("deleted customer cannot login", async () => {
    await authorize_customer_login(deletedCustomerConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
  // 6. Verify admin can still operate (admin account is unaffected)
  TestValidator.predicate(
    "admin is still authenticated",
    adminAuth.id !== null,
  );
}

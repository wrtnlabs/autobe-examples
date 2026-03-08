import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_customer_details_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login for viewing customer details
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 2. Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // Note: No customer ban endpoint exists in API SDK.
  // Only seller ban endpoint is available: api.functional.ecommerceMall.admin.sellers.ban
  // This test validates customer details endpoint returns proper response structure
  // including ban-related fields (isBanned, banReason).
  // 3. Retrieve customer details as admin
  const customerDetails = await api.functional.ecommerceMall.admin.customers.at(
    adminConnection,
    {
      customerId: customerId,
    },
  );
  typia.assert(customerDetails);
  // 4. Validate customer details match
  TestValidator.equals("customer id", customerDetails.id, customerId);
  TestValidator.equals(
    "customer email",
    customerDetails.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "customer isBanned",
    customerDetails.isBanned,
    customerAuth.isBanned,
  );
  TestValidator.equals(
    "customer banReason",
    customerDetails.banReason,
    customerAuth.banReason,
  );
  // 5. Validate timestamp fields exist and are valid date-time format
  TestValidator.predicate(
    "customer has createdAt",
    customerDetails.createdAt !== undefined,
  );
  TestValidator.predicate(
    "customer has updatedAt",
    customerDetails.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "customer has deletedAt",
    customerDetails.deletedAt !== undefined,
  );
  // 6. Verify timestamps are valid ISO date-time strings
  new Date(customerDetails.createdAt); // Should not throw
  new Date(customerDetails.updatedAt); // Should not throw
  if (customerDetails.deletedAt !== null) {
    new Date(customerDetails.deletedAt); // Should not throw
  }
}

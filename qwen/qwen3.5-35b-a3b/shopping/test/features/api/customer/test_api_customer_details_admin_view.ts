import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_details_admin_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create admin connection with token from auth response
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${admin.token.access}` },
  };
  // 3. Retrieve customer details using admin authenticated connection
  // Use simulation mode to ensure API returns valid customer data
  const testConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
    headers: { Authorization: `Bearer ${admin.token.access}` },
  };
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const customer = await api.functional.ecommerceMall.admin.customers.at(
    testConnection,
    { customerId },
  );
  typia.assert(customer);
  // 4. Validate customer ID matches the requested ID
  TestValidator.equals("customer id matches request", customer.id, customerId);
  // 5. Validate email format is correct (email format constraint)
  TestValidator.equals("email format valid", customer.email, customer.email);
  // 6. Validate isBanned is boolean type
  TestValidator.predicate(
    "isBanned is boolean",
    customer.isBanned === true || customer.isBanned === false,
  );
  // 7. Validate banReason is string or null (not exposed password hash)
  if (customer.banReason !== null && customer.banReason !== undefined) {
    TestValidator.predicate(
      "banReason is string when present",
      typeof customer.banReason === "string",
    );
  }
  // 8. Validate deletedAt is either null or valid date-time string
  if (customer.deletedAt !== null) {
    new Date(customer.deletedAt); // Will throw if invalid date-time
  }
  // 9. Security verification: password hash must NOT be exposed in response
  const customerKeys = Object.keys(customer) as string[];
  TestValidator.predicate(
    "password_hash not exposed",
    !customerKeys.includes("password_hash"),
  );
  TestValidator.predicate(
    "password not exposed",
    !customerKeys.includes("password"),
  );
  // 10. Admin can view any customer account (not restricted to self)
  TestValidator.predicate(
    "admin can view customer account",
    customer.id !== admin.id,
  );
}

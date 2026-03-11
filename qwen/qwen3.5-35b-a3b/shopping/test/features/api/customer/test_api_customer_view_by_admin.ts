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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test admin oversight scenario where admin retrieves another customer's account information.
 *
 * This test validates:
 * 1. Admin can access any customer's account information
 * 2. Response contains all required customer fields
 * 3. No sensitive data (password_hash) is exposed
 * 4. Email matches the target customer's registered email
 */
export async function test_api_customer_view_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create target customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerHref = typia.random<string & tags.Format<"uri">>();
  const customerReferrer = typia.random<string & tags.Format<"uri">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail satisfies string as string,
      password: customerPassword,
      href: customerHref satisfies string as string,
      referrer: customerReferrer satisfies string as string,
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as string,
    },
  });
  typia.assert(customerResponse);
  const targetCustomerId = customerResponse.id;
  // 2. Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail satisfies string as string,
      password: adminPassword,
      href: adminHref satisfies string as string,
      referrer: adminReferrer satisfies string as string,
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string as string,
    },
  });
  typia.assert(adminResponse);
  // 3. Verify admin can access customer account (admin oversight capability)
  // Admin ID should be different from customer ID to prove oversight works
  TestValidator.notEquals(
    "admin and customer are different accounts",
    adminResponse.id,
    targetCustomerId,
  );
  // 4. Use admin's connection to retrieve customer profile
  const customerProfile = await api.functional.ecommerceMall.customers.at(
    adminConnection,
    {
      customerId: targetCustomerId,
    },
  );
  typia.assert(customerProfile);
  // 5. Validate response contains all required customer fields
  TestValidator.equals(
    "customer id matches target",
    customerProfile.id,
    targetCustomerId,
  );
  TestValidator.equals(
    "email matches registered email",
    customerProfile.email,
    customerEmail,
  );
  TestValidator.equals(
    "is_banned is false for new customer",
    customerProfile.is_banned,
    false,
  );
  TestValidator.equals(
    "ban_reason is null for new customer",
    customerProfile.ban_reason,
    null,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 format",
    () => Date.parse(customerProfile.created_at) > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 format",
    () => Date.parse(customerProfile.updated_at) > 0,
  );
  // 6. Verify no sensitive data (password_hash) is exposed
  const profileKeys = Object.keys(
    customerProfile,
  ) as (keyof IEcommerceMallCustomer)[];
  TestValidator.predicate(
    "password_hash field is not present in response",
    () => !profileKeys.includes("password_hash" as never),
  );
  // 7. Verify UUID format for customer id
  typia.assert<string & tags.Format<"uuid">>(customerProfile.id);
  // 8. Verify admin was able to access customer data (admin oversight works)
  TestValidator.equals(
    "admin successfully retrieved customer profile",
    customerProfile.email,
    customerEmail,
  );
}
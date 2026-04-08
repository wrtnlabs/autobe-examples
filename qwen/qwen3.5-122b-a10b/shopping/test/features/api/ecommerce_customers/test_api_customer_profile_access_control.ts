import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer profile access control to verify data isolation and privacy boundaries.
 *
 * Validates that customers cannot access other customers' profile information, enforcing the security policy where each customer can only view their own profile. This test ensures proper data isolation between customer accounts.
 *
 * The test creates two separate customer accounts, authenticates the first customer, and attempts to retrieve the second customer's profile. The system must reject this unauthorized access attempt with a 403 Forbidden error.
 *
 * 1. Create first customer account (customer1) via registration
 * 2. Create second customer account (customer2) via registration
 * 3. Authenticate customer1 using their credentials
 * 4. Attempt to retrieve customer2's profile using customer1's authenticated connection
 * 5. Verify the system returns 403 Forbidden error
 * 6. Validate error message indicates unauthorized access to another customer's data
 */
export async function test_api_customer_profile_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first customer account (customer1)
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customer1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  typia.assert(customer1Auth);
  // 2. Create second customer account (customer2)
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customer2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  typia.assert(customer2Auth);
  // 3. Verify customer IDs are different
  TestValidator.notEquals(
    "customer IDs must differ",
    customer1Auth.id,
    customer2Auth.id,
  );
  // 4. Attempt to access customer2's profile using customer1's connection
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "customer1 cannot access customer2's profile",
    403,
    async () => {
      await api.functional.ecommerce.customers.at(customer1Connection, {
        customerId: customer2Auth.id,
      });
    },
  );
}

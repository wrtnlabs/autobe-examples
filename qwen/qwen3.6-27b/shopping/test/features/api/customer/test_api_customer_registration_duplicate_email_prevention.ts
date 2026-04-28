import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
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
 * Test customer registration rejects duplicate email addresses.
 *
 * Validates that the platform enforces email uniqueness by preventing registration with an email that was already used for customer account creation. The system must detect the duplicate email and reject the second registration attempt with an appropriate error response.
 *
 * This ensures the cross-account-type uniqueness constraint is properly enforced in the ecommerce platform's customer registration flow.
 *
 * 1. Create a specific email address for testing.
 * 2. Successfully register a customer with that email.
 * 3. Attempt to register another customer with the same email.
 * 4. Verify the system rejects the duplicate email registration.
 */
export async function test_api_customer_registration_duplicate_email_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Generate a unique email for the first registration
  const testEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // 3. Successfully register first customer with the specific email
  const firstCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: testEmail,
    },
  });
  typia.assert(firstCustomer);
  // 4. Verify the email matches
  TestValidator.equals(
    "first registration email matches",
    firstCustomer.email,
    testEmail,
  );
  // 5. Attempt to register a second customer with the SAME email (should fail)
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration must fail",
    async () => {
      await authorize_customer_join(secondConnection, {
        body: {
          email: testEmail,
        },
      });
    },
  );
}
